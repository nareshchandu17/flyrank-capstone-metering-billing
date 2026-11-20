const db = require('../config/database');
const meterService = require('../services/meterService');

// Get all tenants with real usage, real calculated revenue, and active status
const getAllTenants = async (req, res) => {
  try {
    let query = `
      SELECT 
        t.id,
        t.name,
        t.email,
        t.status,
        t.stripe_customer_id,
        t.plan_id,
        t.created_at,
        p.name as plan_name,
        p.api_calls_limit,
        p.ai_tokens_limit,
        COUNT(DISTINCT ue.id) as total_events,
        COUNT(DISTINCT CASE WHEN ue.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN ue.id END) as monthly_events
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN usage_events ue ON t.id = ue.tenant_id
    `;
    const params = [];

    if (!req.isPlatformAdmin && req.user?.id) {
      query += ` INNER JOIN tenant_memberships tm ON tm.tenant_id = t.id AND tm.user_id = $1 AND tm.status = 'active'`;
      params.push(req.user.id);
    }

    query += `
      GROUP BY t.id, t.name, t.email, t.status, t.stripe_customer_id, t.plan_id, t.created_at, p.name, p.api_calls_limit, p.ai_tokens_limit
      ORDER BY t.created_at DESC
    `;

    const result = await db.query(query, params);

    // Enrich with exact real-time costs and quotas
    const enrichedTenants = [];
    for (const row of result.rows) {
      let tenantCost = '$0.00';
      let tenantTotalUsage = parseInt(row.monthly_events || 0, 10);
      let quotaLimit = (row.api_calls_limit || 0) + (row.ai_tokens_limit || 0);

      try {
        const summary = await meterService.getUsageSummary(row.id);
        tenantCost = `$${summary.costs?.total_dollars || '0.00'}`;
        tenantTotalUsage = (summary.usage?.api_calls?.used || 0) + (summary.usage?.ai_tokens?.used || 0);
      } catch (err) {
        // Fallback to basic invoice sum if usage summary query fails
        const invSum = await db.query(
          'SELECT COALESCE(SUM(amount_cents), 0) as total FROM invoices WHERE tenant_id = $1',
          [row.id]
        );
        tenantCost = `$${(parseInt(invSum.rows[0]?.total || 0, 10) / 100).toFixed(2)}`;
      }

      enrichedTenants.push({
        ...row,
        tier: row.plan_name || 'Free',
        status: row.status || 'active',
        usage: tenantTotalUsage.toLocaleString(),
        revenue: tenantCost,
        cost: tenantCost.replace('$', ''),
        quota: quotaLimit,
        created: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    }

    res.json({ success: true, data: enrichedTenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenants' });
  }
};

// Get tenant by ID
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT t.*, p.name as plan_name, p.api_calls_limit, p.ai_tokens_limit, p.allow_overage
       FROM tenants t
       LEFT JOIN plans p ON t.plan_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenant' });
  }
};

// Create new tenant atomically with initial Tenant Owner membership
const createTenant = async (req, res) => {
  const client = await db.connect();
  try {
    const { name, email, plan = 'Free', plan_id } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required to create a tenant organization' });
    }

    // Check if email already exists
    const existing = await client.query(
      'SELECT id FROM tenants WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Resolve plan ID by plan name or ID
    let resolvedPlanId = plan_id;
    if (!resolvedPlanId) {
      const planRes = await client.query('SELECT id FROM plans WHERE name = $1', [plan]);
      if (planRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: `Plan "${plan}" not found` });
      }
      resolvedPlanId = planRes.rows[0].id;
    }

      await client.query('BEGIN');

    // 1. Create tenant record
    const result = await client.query(
      `INSERT INTO tenants (name, email, plan_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', NOW(), NOW())
       RETURNING *`,
      [name, email, resolvedPlanId]
    );

    const createdTenant = result.rows[0];

    // 2. Atomically create initial Tenant Owner membership (prevents orphan tenants)
    await client.query(
      `INSERT INTO tenant_memberships (user_id, tenant_id, role, status)
       VALUES ($1, $2, 'Tenant Owner', 'active')`,
      [req.user.id, createdTenant.id]
    );

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: createdTenant });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => { });
    console.error('Error creating tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to create tenant' });
  } finally {
    client.release();
  }
};

// Update tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, plan_id, plan } = req.body;

    // Check if tenant exists
    const existing = await db.query(
      'SELECT id FROM tenants WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let resolvedPlanId = plan_id;
    if (plan && !resolvedPlanId) {
      const planRes = await db.query('SELECT id FROM plans WHERE name = $1', [plan]);
      if (planRes.rows.length > 0) {
        resolvedPlanId = planRes.rows[0].id;
      }
    }

    // Update tenant
    const result = await db.query(
      `UPDATE tenants 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           status = COALESCE($3, status),
           plan_id = COALESCE($4, plan_id),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, email, status, resolvedPlanId, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to update tenant' });
  }
};

// Delete tenant
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tenant exists
    const existing = await db.query(
      'SELECT id FROM tenants WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Delete tenant (cascade will handle related records)
    await db.query('DELETE FROM tenants WHERE id = $1', [id]);

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to delete tenant' });
  }
};

// Get tenant usage with correct column names
const getTenantUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_events,
        COALESCE(SUM(CASE WHEN usage_type = 'api_call' THEN quantity ELSE 0 END), 0) as api_calls,
        COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' THEN quantity ELSE 0 END), 0) as ai_tokens
      FROM usage_events
      WHERE tenant_id = $1
      `,
      [id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching tenant usage:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenant usage' });
  }
};

// Get tenant subscription
const getTenantSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
      SELECT s.*, p.name as plan_name, p.api_calls_limit, p.ai_tokens_limit, p.allow_overage
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.tenant_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching tenant subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenant subscription' });
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantUsage,
  getTenantSubscription,
};
