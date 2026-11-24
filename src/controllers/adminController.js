const pool = require('../config/database');
const meterService = require('../services/meterService');
const pricingService = require('../services/pricingService');
const { calculateAPICallCost, calculateAITokenCost } = require('../config/pricing');

class AdminController {
  /**
   * Get all tenants with usage info
   * GET /api/admin/tenants
   */
  async getTenants(req, res) {
    try {
      const query = `
        SELECT 
          t.id, t.name, t.email, t.status, 
          p.name as plan, p.id as plan_id,
          t.created_at,
          COALESCE(u.monthly_api_calls, 0) as monthly_api_calls,
          COALESCE(u.monthly_ai_tokens, 0) as monthly_ai_tokens,
          COALESCE(u.total_input_tokens, 0) as total_input_tokens,
          COALESCE(u.total_cached_input_tokens, 0) as total_cached_input_tokens,
          COALESCE(u.total_output_tokens, 0) as total_output_tokens,
          COALESCE(u.total_reasoning_tokens, 0) as total_reasoning_tokens
        FROM tenants t
        JOIN plans p ON t.plan_id = p.id
        LEFT JOIN (
          SELECT 
            tenant_id,
            COALESCE(SUM(CASE WHEN usage_type = 'api_call' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN quantity ELSE 0 END), 0) as monthly_api_calls,
            COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN quantity ELSE 0 END), 0) as monthly_ai_tokens,
            COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'input_tokens')::numeric, 0) ELSE 0 END), 0) as total_input_tokens,
            COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'cached_input_tokens')::numeric, (metadata->>'cached_tokens')::numeric, 0) ELSE 0 END), 0) as total_cached_input_tokens,
            COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'output_tokens')::numeric, 0) ELSE 0 END), 0) as total_output_tokens,
            COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'reasoning_tokens')::numeric, 0) ELSE 0 END), 0) as total_reasoning_tokens
          FROM usage_events
          GROUP BY tenant_id
        ) u ON t.id = u.tenant_id
        ORDER BY t.created_at DESC
      `;
      const result = await pool.query(query);

      // In-memory O(1) enrichment: zero extra SQL queries per tenant
      const tenants = result.rows.map(row => {
        const apiCallsUsed = parseInt(row.monthly_api_calls || 0, 10);
        const aiTokensUsed = parseInt(row.monthly_ai_tokens || 0, 10);
        let inputTokens = parseInt(row.total_input_tokens || 0, 10);
        const cachedInputTokens = parseInt(row.total_cached_input_tokens || 0, 10);
        const outputTokens = parseInt(row.total_output_tokens || 0, 10);
        const reasoningTokens = parseInt(row.total_reasoning_tokens || 0, 10);

        const brokenDownTokens = inputTokens + cachedInputTokens + outputTokens + reasoningTokens;
        if (aiTokensUsed > brokenDownTokens) {
          inputTokens += (aiTokensUsed - brokenDownTokens);
        }

        const tokenBreakdown = {
          input_tokens: inputTokens,
          cached_input_tokens: cachedInputTokens,
          output_tokens: outputTokens,
          reasoning_tokens: reasoningTokens
        };

        const apiCallCost = calculateAPICallCost(apiCallsUsed);
        const aiTokenExactCents = calculateAITokenCost(tokenBreakdown, { exact: true });
        const totalExactCents = apiCallCost + aiTokenExactCents;
        const totalDollars = (totalExactCents / 100).toFixed(2);

        return {
          id: row.id,
          name: row.name,
          email: row.email,
          status: row.status,
          plan: row.plan,
          plan_id: row.plan_id,
          created_at: row.created_at,
          usage: apiCallsUsed + aiTokensUsed,
          cost: totalDollars
        };
      });

      res.status(200).json(tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create a new tenant
   * POST /api/admin/tenants
   */
  async createTenant(req, res) {
    try {
      const rawName = req.body.name;
      const rawEmail = req.body.email;
      const rawPlan = req.body.plan || 'Free';

      // Strict schema sanitization & validation
      if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
        return res.status(400).json({ error: 'Valid tenant name is required' });
      }
      const name = rawName.trim();
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ error: 'Tenant name must be between 2 and 100 characters' });
      }

      if (!rawEmail || typeof rawEmail !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }
      const email = rawEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || email.length > 255) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      const validPlans = ['Free', 'Pro', 'Enterprise'];
      const plan = validPlans.includes(rawPlan) ? rawPlan : 'Free';

      const planResult = await pool.query('SELECT id FROM plans WHERE name = $1', [plan]);
      if (planResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid plan' });
      }
      const planId = planResult.rows[0].id;

      const result = await pool.query(
        'INSERT INTO tenants (name, email, plan_id) VALUES ($1, $2, $3) RETURNING id, name, email, status',
        [name, email, planId]
      );

      const newTenant = result.rows[0];
      newTenant.plan = plan;
      newTenant.usage = 0;
      newTenant.cost = 0;

      res.status(201).json(newTenant);
    } catch (error) {
      console.error('Error creating tenant:', error);
      if (error.code === '23505') { // unique violation
        return res.status(409).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete a tenant
   * DELETE /api/admin/tenants/:id
   */
  async deleteTenant(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a tenant
   * PUT /api/admin/tenants/:id
   */
  async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const { name, email, status } = req.body;

      const result = await pool.query(
        'UPDATE tenants SET name = COALESCE($1, name), email = COALESCE($2, email), status = COALESCE($3, status) WHERE id = $4 RETURNING id, name, email, status',
        [name, email, status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error updating tenant:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get global metrics with genuine database aggregations
   * GET /api/admin/metrics
   */
  async getMetrics(req, res) {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);

      const tenantsStats = await pool.query(`
        SELECT 
          COUNT(*) as total_tenants,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants
        FROM tenants
      `);

      const revenueStats = await pool.query(`
        SELECT 
          COALESCE(SUM(amount_cents), 0) as total_revenue_cents,
          COALESCE(SUM(CASE WHEN billing_period = $1 THEN amount_cents ELSE 0 END), 0) as month_revenue_cents,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'pending' OR status = 'open' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'payment_failed' THEN 1 END) as failed_invoices
        FROM invoices
      `, [currentMonth]);

      const usageStats = await pool.query(`
        SELECT 
          COUNT(*) as total_events,
          COALESCE(SUM(CASE WHEN usage_type = 'api_call' THEN quantity ELSE 0 END), 0) as total_api_calls,
          COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' THEN quantity ELSE 0 END), 0) as total_ai_tokens,
          COUNT(CASE WHEN created_at >= NOW() - interval '30 days' THEN 1 END) as current_30d_events,
          COUNT(CASE WHEN created_at >= NOW() - interval '60 days' AND created_at < NOW() - interval '30 days' THEN 1 END) as prev_30d_events
        FROM usage_events
      `);

      const totalTenants = parseInt(tenantsStats.rows[0].total_tenants, 10);
      const activeTenants = parseInt(tenantsStats.rows[0].active_tenants, 10);
      const totalRevenueCents = parseInt(revenueStats.rows[0].total_revenue_cents, 10);
      const monthRevenueCents = parseInt(revenueStats.rows[0].month_revenue_cents, 10);
      const totalEvents = parseInt(usageStats.rows[0].total_events, 10);
      const currentEvents = parseInt(usageStats.rows[0].current_30d_events, 10);
      const prevEvents = parseInt(usageStats.rows[0].prev_30d_events, 10);

      // Real calculated monthly growth
      let monthlyGrowth = 0.0;
      if (prevEvents > 0) {
        monthlyGrowth = parseFloat((((currentEvents - prevEvents) / prevEvents) * 100).toFixed(1));
      } else if (currentEvents > 0) {
        monthlyGrowth = 100.0;
      }

      // Real calculated average usage per tenant
      const avgUsage = totalTenants > 0 ? Math.round(totalEvents / totalTenants) : 0;

      res.status(200).json({
        totalTenants,
        activeTenants,
        totalRevenue: (totalRevenueCents / 100).toFixed(2),
        monthlyRevenue: (monthRevenueCents / 100).toFixed(2),
        totalApiCalls: parseInt(usageStats.rows[0].total_api_calls, 10),
        totalAiTokens: parseInt(usageStats.rows[0].total_ai_tokens, 10),
        totalEvents,
        monthlyGrowth,
        avgUsage,
        billingStatus: {
          paid: parseInt(revenueStats.rows[0].paid_invoices, 10),
          pending: parseInt(revenueStats.rows[0].pending_invoices, 10),
          failed: parseInt(revenueStats.rows[0].failed_invoices, 10)
        }
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get global usage history with exact calculated costs and filters
   * GET /api/admin/usage/history
   */
  async getUsageHistory(req, res) {
    try {
      const { tenant_id, usage_type, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT 
          u.id, 
          t.name as tenant, 
          u.tenant_id,
          u.usage_type as metric, 
          u.quantity as value, 
          u.metadata,
          u.idempotency_key,
          u.created_at as date
        FROM usage_events u
        JOIN tenants t ON u.tenant_id = t.id
      `;
      const params = [];

      if (tenant_id) {
        params.push(tenant_id);
        query += ` WHERE u.tenant_id = $${params.length}`;
      }

      if (usage_type) {
        params.push(usage_type);
        query += params.length === 1 ? ` WHERE u.usage_type = $${params.length}` : ` AND u.usage_type = $${params.length}`;
      }

      query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const result = await pool.query(query, params);
      const { calculateAITokenCost, calculateAPICallCost } = require('../config/pricing');

      const history = result.rows.map(row => {
        let costCents = 0;
        if (row.metric === 'api_call') {
          costCents = calculateAPICallCost(parseInt(row.value, 10));
        } else if (row.metric === 'ai_tokens') {
          costCents = calculateAITokenCost(row.metadata || { input_tokens: parseInt(row.value, 10) }, { exact: true });
        }

        const dateObj = row.date ? new Date(row.date) : new Date();
        const isValidDate = !isNaN(dateObj.getTime());
        return {
          id: row.id,
          tenant: row.tenant,
          tenant_id: row.tenant_id,
          metric: row.metric === 'api_call' ? 'API Calls' : 'AI Tokens',
          usage_type: row.metric,
          value: parseInt(row.value, 10) || 0,
          unit: row.metric === 'api_call' ? 'calls' : 'tokens',
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {}),
          idempotency_key: row.idempotency_key,
          date: isValidDate ? dateObj.toISOString().split('T')[0] : '',
          time: isValidDate ? dateObj.toISOString().split('T')[1].substring(0, 8) : '',
          timestamp: row.date,
          cost: (costCents / 100).toFixed(4),
          cost_formatted: `$${(costCents / 100).toFixed(2)}`
        };
      });

      res.status(200).json(history);
    } catch (error) {
      console.error('Error fetching usage history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get real time usage trends based on actual hourly database events
   * GET /api/admin/usage/realtime
   */
  async getRealTimeUsage(req, res) {
    try {
      const query = `
        SELECT 
          to_char(date_trunc('hour', created_at), 'HH24:00') as time,
          COALESCE(SUM(quantity), 0) as value,
          COUNT(*) as event_count
        FROM usage_events
        WHERE created_at >= NOW() - interval '24 hours'
        GROUP BY date_trunc('hour', created_at)
        ORDER BY date_trunc('hour', created_at) ASC
      `;
      const result = await pool.query(query);

      // If database has events in the past 24 hours, return them
      if (result.rows.length >= 4) {
        return res.status(200).json(
          result.rows.map(r => ({
            time: r.time,
            value: parseInt(r.value, 10),
            events: parseInt(r.event_count, 10)
          }))
        );
      }

      // If recent events are few, construct full standard 6-slot timeline with real values
      const intervals = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      const resultMap = new Map(result.rows.map(r => [r.time, parseInt(r.value, 10)]));

      const realTimeData = intervals.map(time => ({
        time,
        value: resultMap.get(time) || 0
      }));

      res.status(200).json(realTimeData);
    } catch (error) {
      console.error('Error fetching real-time usage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all plans with database quotas and pricing
   * GET /api/admin/plans
   */
  async getPlans(req, res) {
    try {
      const result = await pool.query('SELECT * FROM plans ORDER BY id ASC');
      res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  }

  /**
   * Update plan quotas or base price
   * PUT /api/admin/plans/:id
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const { api_calls_limit, ai_tokens_limit, allow_overage, base_price_cents } = req.body;

      const updates = [];
      const values = [];
      let idx = 1;

      if (api_calls_limit !== undefined) {
        updates.push(`api_calls_limit = $${idx++}`);
        values.push(parseInt(api_calls_limit, 10));
      }
      if (ai_tokens_limit !== undefined) {
        updates.push(`ai_tokens_limit = $${idx++}`);
        values.push(parseInt(ai_tokens_limit, 10));
      }
      if (allow_overage !== undefined) {
        updates.push(`allow_overage = $${idx++}`);
        values.push(Boolean(allow_overage));
      }
      if (base_price_cents !== undefined) {
        updates.push(`base_price_cents = $${idx++}`);
        values.push(parseInt(base_price_cents, 10));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
      }

      values.push(id);
      const query = `
        UPDATE plans
        SET ${updates.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      pricingService.invalidateCache();

      res.status(200).json({ success: true, plan: result.rows[0] });
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(500).json({ error: 'Failed to update plan' });
    }
  }

  /**
   * Get all active and inactive pricing rules
   * GET /api/admin/pricing-rules
   */
  async getPricingRules(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM pricing_rules 
        ORDER BY category, tier_min_units ASC NULLS LAST, rule_key ASC
      `);
      res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
      res.status(500).json({ error: 'Failed to fetch pricing rules' });
    }
  }

  /**
   * Update a pricing rule
   * PUT /api/admin/pricing-rules/:id
   */
  async updatePricingRule(req, res) {
    try {
      const { id } = req.params;
      const { rate_cents, unit_multiplier, tier_min_units, tier_max_units, is_active } = req.body;

      const updates = [];
      const values = [];
      let idx = 1;

      if (rate_cents !== undefined) {
        updates.push(`rate_cents = $${idx++}`);
        values.push(parseFloat(rate_cents));
      }
      if (unit_multiplier !== undefined) {
        updates.push(`unit_multiplier = $${idx++}`);
        values.push(parseFloat(unit_multiplier));
      }
      if (tier_min_units !== undefined) {
        updates.push(`tier_min_units = $${idx++}`);
        values.push(tier_min_units === null ? null : parseInt(tier_min_units, 10));
      }
      if (tier_max_units !== undefined) {
        updates.push(`tier_max_units = $${idx++}`);
        values.push(tier_max_units === null ? null : parseInt(tier_max_units, 10));
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${idx++}`);
        values.push(Boolean(is_active));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE pricing_rules
        SET ${updates.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pricing rule not found' });
      }

      pricingService.invalidateCache();

      res.status(200).json({ success: true, rule: result.rows[0] });
    } catch (error) {
      console.error('Error updating pricing rule:', error);
      res.status(500).json({ error: 'Failed to update pricing rule' });
    }
  }
}

module.exports = new AdminController();
