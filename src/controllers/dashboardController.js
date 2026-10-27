const db = require('../config/database');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total tenants count
    const tenantsResult = await db.query('SELECT COUNT(*) as count FROM tenants');
    const totalTenants = parseInt(tenantsResult.rows[0].count);

    // Get active tenants (with subscriptions)
    const activeTenantsResult = await db.query(`
      SELECT COUNT(DISTINCT t.id) as count
      FROM tenants t
      JOIN subscriptions s ON t.id = s.tenant_id
      WHERE s.status = 'active'
    `);
    const activeTenants = parseInt(activeTenantsResult.rows[0].count);

    // Get total usage events this month
    const usageResult = await db.query(`
      SELECT COUNT(*) as count
      FROM usage_events
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    const monthlyUsage = parseInt(usageResult.rows[0].count);

    // Calculate real revenue from database invoices
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(amount_cents), 0) as total_cents
      FROM invoices
    `);
    const totalRevenue = parseFloat(((parseInt(revenueResult.rows[0].total_cents, 10)) / 100).toFixed(2));

    // Get recent activity
    const recentActivityResult = await db.query(`
      SELECT 
        t.name as tenant_name,
        ue.usage_type as event_type,
        ue.quantity,
        ue.created_at
      FROM usage_events ue
      JOIN tenants t ON ue.tenant_id = t.id
      ORDER BY ue.created_at DESC
      LIMIT 10
    `);

    // Map recent activity for frontend
    const recentActivity = recentActivityResult.rows.map(row => ({
      ...row,
      event_type: row.usage_type,
      action: `${row.usage_type === 'api_call' ? 'API' : 'AI Token'} usage event`
    }));

    // Get top tenants by usage
    const topTenantsResult = await db.query(`
      SELECT 
        t.id,
        t.name,
        COUNT(ue.id) as usage_count,
        p.name as plan_name
      FROM tenants t
      LEFT JOIN usage_events ue ON t.id = ue.tenant_id
      LEFT JOIN plans p ON t.plan_id = p.id
      GROUP BY t.id, t.name, p.name
      ORDER BY usage_count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        monthlyUsage,
        totalRevenue,
        recentActivity,
        topTenants: topTenantsResult.rows,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  getDashboardStats,
};