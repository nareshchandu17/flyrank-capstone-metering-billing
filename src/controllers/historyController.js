const db = require('../config/database');

// Get all transactions
const getTransactions = async (req, res) => {
  try {
    const { limit = 50, offset = 0, tenant_id } = req.query;

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
    const paramCount = [];

    if (tenant_id) {
      query += ' WHERE ue.tenant_id = $1';
      params.push(tenant_id);
      paramCount.push(1);
    }

    query += ' ORDER BY ue.created_at DESC LIMIT $' + (paramCount.length + 1) + ' OFFSET $' + (paramCount.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Map usage_type to event_type for frontend compatibility
    const mappedData = result.rows.map(row => ({
      ...row,
      event_type: row.usage_type,
      type: row.usage_type === 'api_call' ? 'usage' : row.usage_type === 'ai_tokens' ? 'payment' : 'usage',
      status: 'completed',
      amount: row.usage_type === 'ai_tokens' ? `$${(row.quantity * 0.0003).toFixed(2)}` : '$0.00',
      description: `${row.usage_type === 'api_call' ? 'API' : 'AI Token'} usage event`
    }));

    res.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// Get invoices
const getInvoices = async (req, res) => {
  try {
    const { tenant_id } = req.query;

    let query = `
      SELECT 
        i.*,
        t.name as tenant_name
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
    `;
    const params = [];

    if (tenant_id) {
      query += ' WHERE i.tenant_id = $1';
      params.push(tenant_id);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await db.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
};

// Get transaction summary
const getTransactionSummary = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_transactions,
        SUM(CASE WHEN usage_type = 'api_call' THEN 1 ELSE 0 END) as total_api_calls,
        SUM(CASE WHEN usage_type = 'ai_tokens' THEN quantity ELSE 0 END) as total_ai_tokens,
        COUNT(DISTINCT tenant_id) as total_tenants
      FROM usage_events
    `);

    const completed = await db.query(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
    `);

    const pending = await db.query(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'pending'
    `);

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        completed_invoices: parseInt(completed.rows[0].count),
        pending_invoices: parseInt(pending.rows[0].count),
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
