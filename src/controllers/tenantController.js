const db = require('../config/database');

// Get all tenants
const getAllTenants = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.stripe_customer_id,
        t.plan_id,
        p.name as plan_name,
        p.api_calls_limit,
        p.ai_tokens_limit,
        COUNT(DISTINCT ue.id) as total_events,
        COUNT(DISTINCT CASE WHEN ue.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN ue.id END) as monthly_events
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN usage_events ue ON t.id = ue.tenant_id
      GROUP BY t.id, t.name, t.email, t.stripe_customer_id, t.plan_id, p.name, p.api_calls_limit, p.ai_tokens_limit
      ORDER BY t.created_at DESC
    `);
    
    // Map plan names to tier names for frontend
    const mappedData = result.rows.map(row => ({
      ...row,
      tier: row.plan_name,
      status: 'active',
      usage: row.monthly_events?.toLocaleString() || '0',
      revenue: '$0.00',
      growth: '+0%',
      quota: 0,
      apiKey: 'pk_live_••••••••••••••••',
      created: new Date(row.created_at).toISOString().split('T')[0]
    }));
    
    res.json({ success: true, data: mappedData });
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
      'SELECT * FROM tenants WHERE id = $1',
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

// Create new tenant
const createTenant = async (req, res) => {
  try {
    const { name, email, plan_id = 1 } = req.body;
    
    // Validate input
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    
    // Check if email already exists
    const existing = await db.query(
      'SELECT id FROM tenants WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    // Create tenant
    const result = await db.query(
      `INSERT INTO tenants (name, email, plan_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [name, email, plan_id]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ success: false, message: 'Failed to create tenant' });
  }
};

// Update tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, plan_id } = req.body;
    
    // Check if tenant exists
    const existing = await db.query(
      'SELECT id FROM tenants WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    // Update tenant
    const result = await db.query(
      `UPDATE tenants 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           plan_id = COALESCE($3, plan_id),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, email, plan_id, id]
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

// Get tenant usage
const getTenantUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_events,
        SUM(CASE WHEN event_type = 'api_call' THEN 1 ELSE 0 END) as api_calls,
        SUM(CASE WHEN event_type = 'ai_token' THEN quantity ELSE 0 END) as ai_tokens
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
      SELECT s.*, p.name as plan_name, p.api_calls_limit, p.ai_tokens_limit
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