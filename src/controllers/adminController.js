const pool = require('../config/database');
const meterService = require('../services/meterService');

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
          t.created_at
        FROM tenants t
        JOIN plans p ON t.plan_id = p.id
        ORDER BY t.created_at DESC
      `;
      const result = await pool.query(query);
      
      const tenants = result.rows;
      
      // Calculate current month usage & cost for each tenant
      for (let i = 0; i < tenants.length; i++) {
        try {
          const summary = await meterService.getUsageSummary(tenants[i].id);
          tenants[i].usage = summary.usage.api_calls.used + summary.usage.ai_tokens.used; 
          tenants[i].cost = summary.costs.total_dollars;
        } catch (e) {
          tenants[i].usage = 0;
          tenants[i].cost = 0;
        }
      }
      
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
      const { name, email, plan = 'Free' } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
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

        const dateObj = new Date(row.date);
        return {
          id: row.id,
          tenant: row.tenant,
          tenant_id: row.tenant_id,
          metric: row.metric === 'api_call' ? 'API Calls' : 'AI Tokens',
          usage_type: row.metric,
          value: parseInt(row.value, 10),
          unit: row.metric === 'api_call' ? 'calls' : 'tokens',
          metadata: row.metadata,
          idempotency_key: row.idempotency_key,
          date: dateObj.toISOString().split('T')[0],
          time: dateObj.toISOString().split('T')[1].substring(0, 8),
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
}

module.exports = new AdminController();
