const db = require('../config/database');

/**
 * Get dashboard statistics with strict tenant scoping or global platform metrics for Platform Admins.
 */
const getDashboardStats = async (req, res) => {
  try {
    const isGlobal = req.isPlatformAdmin && !req.tenantId;

    if (isGlobal) {
      // Platform Admin global metrics across all tenants
      const tenantsResult = await db.query('SELECT COUNT(*) as count FROM tenants');
      const totalTenants = parseInt(tenantsResult.rows[0].count, 10);

      const activeTenantsResult = await db.query(`
        SELECT COUNT(DISTINCT t.id) as count
        FROM tenants t
        JOIN subscriptions s ON t.id = s.tenant_id
        WHERE s.status = 'active'
      `);
      const activeTenants = parseInt(activeTenantsResult.rows[0].count, 10);

      const usageResult = await db.query(`
        SELECT COUNT(*) as count
        FROM usage_events
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `);
      const monthlyUsage = parseInt(usageResult.rows[0].count, 10);

      const revenueResult = await db.query(`
        SELECT COALESCE(SUM(amount_cents), 0) as total_cents
        FROM invoices
      `);
      const totalRevenue = parseFloat(((parseInt(revenueResult.rows[0].total_cents, 10)) / 100).toFixed(2));

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

      return res.json({
        success: true,
        data: {
          totalTenants,
          activeTenants,
          monthlyUsage,
          totalRevenue,
          recentActivity: recentActivityResult.rows.map(row => ({
            ...row,
            event_type: row.usage_type,
            action: `${row.usage_type === 'api_call' ? 'API' : 'AI Token'} usage event`
          })),
          topTenants: topTenantsResult.rows,
        }
      });
    }

    // Scoped metrics for a specific tenant
    const targetTenantId = req.tenantId;

    const tenantRes = await db.query(
      `SELECT t.id, t.name, t.status, p.name as plan_name, p.api_calls_limit, p.ai_tokens_limit 
       FROM tenants t 
       LEFT JOIN plans p ON t.plan_id = p.id 
       WHERE t.id = $1`,
      [targetTenantId]
    );

    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantRes.rows[0];

    const usageResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_quantity
       FROM usage_events
       WHERE tenant_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [targetTenantId]
    );
    const monthlyUsage = parseInt(usageResult.rows[0].count, 10);

    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total_cents
       FROM invoices
       WHERE tenant_id = $1`,
      [targetTenantId]
    );
    const totalRevenue = parseFloat(((parseInt(revenueResult.rows[0].total_cents, 10)) / 100).toFixed(2));

    const recentActivityResult = await db.query(
      `SELECT 
        $2 as tenant_name,
      ue.usage_type as event_type,
      ue.quantity,
      ue.created_at
      FROM usage_events ue
      WHERE ue.tenant_id = $1
      ORDER BY ue.created_at DESC
      LIMIT 10`,
      [targetTenantId, tenant.name]
    );

      return res.json({
        success: true,
        data: {
          totalTenants: 1,
          activeTenants: tenant.status === 'active' ? 1 : 0,
          monthlyUsage,
          totalRevenue,
          recentActivity: recentActivityResult.rows.map(row => ({
            ...row,
            event_type: row.usage_type,
            action: `${row.usage_type === 'api_call' ? 'API' : 'AI Token'} usage event`
          })),
          topTenants: [tenant],
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
