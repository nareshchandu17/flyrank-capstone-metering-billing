const db = require('../config/database');
const meterService = require('../services/meterService');
const { calculateAPICallCost, calculateAITokenCost } = require('../config/pricing');

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
        COALESCE(u.monthly_api_calls, 0) as monthly_api_calls,
        COALESCE(u.monthly_ai_tokens, 0) as monthly_ai_tokens,
        COALESCE(u.total_input_tokens, 0) as total_input_tokens,
        COALESCE(u.total_cached_input_tokens, 0) as total_cached_input_tokens,
        COALESCE(u.total_output_tokens, 0) as total_output_tokens,
        COALESCE(u.total_reasoning_tokens, 0) as total_reasoning_tokens,
        COALESCE(u.monthly_events, 0) as monthly_events,
        COALESCE(u.total_events, 0) as total_events,
        COALESCE(inv.total_cost_cents, 0) as total_invoiced_cents
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN (
        SELECT 
          tenant_id,
          COUNT(*) as total_events,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN 1 END) as monthly_events,
          COALESCE(SUM(CASE WHEN usage_type = 'api_call' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN quantity ELSE 0 END), 0) as monthly_api_calls,
          COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN quantity ELSE 0 END), 0) as monthly_ai_tokens,
          COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'input_tokens')::numeric, 0) ELSE 0 END), 0) as total_input_tokens,
          COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'cached_input_tokens')::numeric, (metadata->>'cached_tokens')::numeric, 0) ELSE 0 END), 0) as total_cached_input_tokens,
          COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'output_tokens')::numeric, 0) ELSE 0 END), 0) as total_output_tokens,
          COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN COALESCE((metadata->>'reasoning_tokens')::numeric, 0) ELSE 0 END), 0) as total_reasoning_tokens
        FROM usage_events
        GROUP BY tenant_id
      ) u ON t.id = u.tenant_id
      LEFT JOIN (
        SELECT tenant_id, SUM(amount_cents) as total_cost_cents
        FROM invoices
        GROUP BY tenant_id
      ) inv ON t.id = inv.tenant_id
    `;
    const params = [];

    if (!req.isPlatformAdmin && req.user?.id) {
      query += ` INNER JOIN tenant_memberships tm ON tm.tenant_id = t.id AND tm.user_id = $1 AND tm.status = 'active'`;
      params.push(req.user.id);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await db.query(query, params);

    // Enrich with exact real-time costs and quotas in-memory (O(1) calculation, zero extra DB queries)
    const enrichedTenants = result.rows.map(row => {
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

      const tenantCost = totalExactCents > 0
        ? `$${totalDollars}`
        : (row.total_invoiced_cents > 0 ? `$${(parseInt(row.total_invoiced_cents, 10) / 100).toFixed(2)}` : '$0.00');

      const tenantTotalUsage = apiCallsUsed + aiTokensUsed;
      const quotaLimit = (row.api_calls_limit || 0) + (row.ai_tokens_limit || 0);

      return {
        ...row,
        tier: row.plan_name || 'Free',
        status: row.status || 'active',
        usage: tenantTotalUsage.toLocaleString(),
        revenue: tenantCost,
        cost: tenantCost.replace('$', ''),
        quota: quotaLimit,
        created: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
    });

    res.json({ success: true, data: enrichedTenants, tenants: enrichedTenants });
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
    const { plan_id } = req.body;
    const rawName = req.body.name;
    const rawEmail = req.body.email;
    const rawPlan = req.body.plan || 'Free';

    // Strict schema sanitization & validation
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({ success: false, message: 'Valid organization name is required' });
    }
    const name = rawName.trim();
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, message: 'Organization name must be between 2 and 100 characters' });
    }

    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return res.status(400).json({ success: false, message: 'Invalid email address format' });
    }

    const validPlans = ['Free', 'Pro', 'Enterprise'];
    const plan = validPlans.includes(rawPlan) ? rawPlan : 'Free';

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
