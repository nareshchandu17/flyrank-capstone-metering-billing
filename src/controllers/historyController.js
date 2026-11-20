const db = require('../config/database');
const { calculateAITokenCost, calculateAPICallCost } = require('../config/pricing');

// Get transactions strictly scoped to tenant (or global if Platform Admin)
const getTransactions = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const isGlobal = req.isPlatformAdmin && !req.tenantId;

    if (!isGlobal && !req.tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context (tenant_id) is required' });
    }

    let query = `
      SELECT 
        ue.*,
        t.name as tenant_name,
        p.name as plan_name
      FROM usage_events ue
      JOIN tenants t ON ue.tenant_id = t.id
      LEFT JOIN plans p ON t.plan_id = p.id
    `;
    const params = [];

    if (!isGlobal) {
      params.push(req.tenantId);
      query += ` WHERE ue.tenant_id = $${params.length}`;
    }

    query += ` ORDER BY ue.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(query, params);

    const mappedData = result.rows.map(row => {
      let costCents = 0;
      if (row.usage_type === 'api_call') {
        costCents = calculateAPICallCost(parseInt(row.quantity, 10));
      } else if (row.usage_type === 'ai_tokens') {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {});
        costCents = calculateAITokenCost(metadata.input_tokens ? metadata : { input_tokens: parseInt(row.quantity, 10) }, { exact: true });
      }

      return {
        ...row,
        event_type: row.usage_type,
        type: 'usage',
        status: 'completed',
        amount: `$${(costCents / 100).toFixed(4)}`,
        description: `${row.usage_type === 'api_call' ? 'API Call' : 'AI Token'} usage event (${parseInt(row.quantity, 10).toLocaleString()} units)`
      };
    });

    res.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// Get invoices strictly scoped to tenant (or global if Platform Admin)
const getInvoices = async (req, res) => {
  try {
    const isGlobal = req.isPlatformAdmin && !req.tenantId;

    if (!isGlobal && !req.tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context (tenant_id) is required' });
    }

    let query = `
      SELECT 
        i.*,
        t.name as tenant_name
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
    `;
    const params = [];

    if (!isGlobal) {
      params.push(req.tenantId);
      query += ` WHERE i.tenant_id = $1`;
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
};

// Get transaction summary strictly scoped to tenant (or global if Platform Admin)
const getTransactionSummary = async (req, res) => {
  try {
    const isGlobal = req.isPlatformAdmin && !req.tenantId;

    if (!isGlobal && !req.tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context (tenant_id) is required' });
    }

      let statsQuery = `
      SELECT
      COUNT(*) as total_transactions,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_transactions,
        COALESCE(SUM(CASE WHEN usage_type = 'api_call' THEN 1 ELSE 0 END), 0) as total_api_calls,
        COALESCE(SUM(CASE WHEN usage_type = 'ai_tokens' THEN quantity ELSE 0 END), 0) as total_ai_tokens,
        COUNT(DISTINCT tenant_id) as total_tenants
      FROM usage_events
        `;

      let invoiceQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'pending' OR status = 'open' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'payment_failed' THEN 1 END) as failed_invoices
      FROM invoices
    `;

      let subQuery = `
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
        `;

      const params = [];
      if (!isGlobal) {
        params.push(req.tenantId);
        statsQuery += ` WHERE tenant_id = $1`;
        invoiceQuery += ` WHERE tenant_id = $1`;
        subQuery += ` AND tenant_id = $1`;
      }

        const [stats, invoiceStats, activeSubs] = await Promise.all([
          db.query(statsQuery, params),
          db.query(invoiceQuery, params),
          db.query(subQuery, params)
        ]);

        res.json({
          success: true,
          data: {
            ...stats.rows[0],
            completed_invoices: parseInt(invoiceStats.rows[0]?.paid_invoices || 0, 10),
            pending_invoices: parseInt(invoiceStats.rows[0]?.pending_invoices || 0, 10),
            failed_invoices: parseInt(invoiceStats.rows[0]?.failed_invoices || 0, 10),
            active_subscriptions: parseInt(activeSubs.rows[0]?.count || 0, 10),
          }
        });
      } catch (error) {
        console.error('Error fetching transaction summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transaction summary' });
      }
    };

    module.exports = {
      getTransactions,
      getInvoices,
      getTransactionSummary,
    };
