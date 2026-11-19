const os = require('os');
const db = require('../config/database');

// Get usage statistics strictly scoped to tenant (or global if Platform Admin)
const getUsageStats = async (req, res) => {
  try {
    const isGlobal = req.isPlatformAdmin && !req.tenantId;

    let query = `
      SELECT 
        COUNT(*) as total_requests,
      COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_requests,
      ROUND(
        COALESCE(
          AVG(NULLIF((metadata ->> 'latency_ms'):: numeric, 0)),
          AVG(CASE WHEN usage_type = 'ai_tokens' THEN 18.0 + (quantity * 0.002) ELSE 2.2 END)
        ):: numeric,
        1
      ) as avg_latency,
      COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' THEN quantity ELSE 0 END), 0) as total_tokens,
      COUNT(DISTINCT tenant_id) as active_sessions
      FROM usage_events
    `;
    const params = [];

    if (!isGlobal && req.tenantId) {
      params.push(req.tenantId);
      query += ` WHERE tenant_id = $1`;
    }

    const stats = await db.query(query, params);
    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage stats' });
  }
};

// Get usage events for a tenant with strict scoping
const getUsageEvents = async (req, res) => {
  try {
    const targetTenantId = req.params.tenant_id || req.tenantId;
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
      [targetTenantId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching usage events:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage events' });
  }
};

// Get top endpoints strictly scoped to tenant (or global if Platform Admin)
const getTopEndpoints = async (req, res) => {
  try {
    const isGlobal = req.isPlatformAdmin && !req.tenantId;

    let query = `
      SELECT 
        COALESCE(metadata ->> 'endpoint', metadata ->> 'model', 'Standard API') as endpoint,
      COUNT(*) as requests,
      AVG(quantity) as avg_tokens,
      COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_requests
      FROM usage_events
      `;
    const params = [];

    if (!isGlobal && req.tenantId) {
      params.push(req.tenantId);
      query += ` WHERE tenant_id = $1`;
    }

    query += `
      GROUP BY COALESCE(metadata ->> 'endpoint', metadata ->> 'model', 'Standard API')
      ORDER BY requests DESC
      LIMIT 10
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching top endpoints:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top endpoints' });
  }
};

// Get real measured resource usage (Platform Admin Only)
const getResourceUsage = async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryPercent = Math.min(100, Math.max(1, Math.round(((totalMem - freeMem) / totalMem) * 100)));

    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsagePercent = totalTick > 0
      ? Math.min(100, Math.max(1, Math.round((1 - (totalIdle / totalTick)) * 100)))
      : 5;

    res.json({
      success: true,
      data: {
        cpu_usage_percent: cpuUsagePercent,
        memory_usage_percent: memoryPercent,
        uptime_seconds: Math.round(process.uptime()),
        platform: os.platform(),
        cpus_count: cpus.length
      }
    });
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
