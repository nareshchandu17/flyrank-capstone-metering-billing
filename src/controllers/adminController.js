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
   * Get global metrics
   * GET /api/admin/metrics
   */
  async getMetrics(req, res) {
    try {
      const totalTenantsResult = await pool.query('SELECT COUNT(*) FROM tenants');
      const activeTenantsResult = await pool.query("SELECT COUNT(*) FROM tenants WHERE status = 'active'");
      
      // Calculate total revenue for current month (from invoices)
      const currentMonth = new Date().toISOString().substring(0, 7);
      const revenueResult = await pool.query(
        'SELECT COALESCE(SUM(amount_cents), 0) as total FROM invoices WHERE billing_period = $1', 
        [currentMonth]
      );
      
      res.status(200).json({
        totalTenants: parseInt(totalTenantsResult.rows[0].count),
        activeTenants: parseInt(activeTenantsResult.rows[0].count),
        totalRevenue: (parseInt(revenueResult.rows[0].total) / 100).toFixed(2),
        monthlyGrowth: 15.5, // placeholder
        avgUsage: 250 // placeholder
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get global usage history
   * GET /api/admin/usage/history
   */
  async getUsageHistory(req, res) {
    try {
      const query = `
        SELECT 
          u.id, 
          t.name as tenant, 
          u.usage_type as metric, 
          u.quantity as value, 
          u.created_at as date
        FROM usage_events u
        JOIN tenants t ON u.tenant_id = t.id
        ORDER BY u.created_at DESC
        LIMIT 50
      `;
      const result = await pool.query(query);
      
      const history = result.rows.map(row => ({
        id: row.id,
        tenant: row.tenant,
        metric: row.metric === 'api_call' ? 'API Calls' : 'AI Tokens',
        value: parseInt(row.value),
        unit: row.metric === 'api_call' ? 'calls' : 'tokens',
        date: row.date.toISOString().split('T')[0],
        cost: 0 // Simplification for feed view
      }));
      
      res.status(200).json(history);
    } catch (error) {
      console.error('Error fetching usage history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get real time usage stats (mocked up based on recent events)
   * GET /api/admin/usage/realtime
   */
  async getRealTimeUsage(req, res) {
    // For capstone purposes, we'll return the mock structure the UI expects
    // Real implementation would group usage_events by hour for the last 24h
    res.status(200).json([
      { time: '00:00', value: 120 },
      { time: '04:00', value: 85 },
      { time: '08:00', value: 320 },
      { time: '12:00', value: 580 },
      { time: '16:00', value: 490 },
      { time: '20:00', value: 380 },
    ]);
  }
}

module.exports = new AdminController();
