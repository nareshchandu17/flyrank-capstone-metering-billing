const db = require('../config/database');

// Get usage statistics
const getUsageStats = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_requests,
        AVG(EXTRACT(EPOCH FROM (created_at - created_at)) * 1000) as avg_latency,
        COUNT(CASE WHEN usage_type = 'ai_tokens' THEN 1 END) as total_tokens,
        COUNT(DISTINCT tenant_id) as active_sessions
      FROM usage_events
    `);

    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage stats' });
  }
};

// Get usage events for a tenant
const getUsageEvents = async (req, res) => {
  try {
    const { tenant_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `
      SELECT 
        ue.*,
        t.name as tenant_name
      FROM usage_events ue
      JOIN tenants t ON ue.tenant_id = t.id
      WHERE ue.tenant_id = $1
      ORDER BY ue.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [tenant_id, limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching usage events:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage events' });
  }
};

// Get top endpoints
const getTopEndpoints = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        metadata->>'endpoint' as endpoint,
        COUNT(*) as requests,
        AVG(quantity) as avg_tokens,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_requests
      FROM usage_events
      WHERE metadata->>'endpoint' IS NOT NULL
      GROUP BY metadata->>'endpoint'
      ORDER BY requests DESC
      LIMIT 10
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching top endpoints:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top endpoints' });
  }
};

// Get resource usage
const getResourceUsage = async (req, res) => {
  try {
    // Simulated resource usage - in real app, this would come from monitoring
    const resourceUsage = [
      { name: 'CPU', usage: 78 },
      { name: 'Memory', usage: 65 },
      { name: 'Storage', usage: 45 },
      { name: 'Network', usage: 82 },
    ];

    res.json({ success: true, data: resourceUsage });
  } catch (error) {
    console.error('Error fetching resource usage:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resource usage' });
  }
};

module.exports = {
  getUsageStats,
  getUsageEvents,
  getTopEndpoints,
  getResourceUsage,
};
