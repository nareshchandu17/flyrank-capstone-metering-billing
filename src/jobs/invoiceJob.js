const cron = require('node-cron');
const pool = require('../config/database');
const meterService = require('../services/meterService');

/**
 * Invoice Job
 * Runs on the 1st of every month to generate invoices for the previous month
 */
class InvoiceJob {
  start() {
    // Run at 00:00 on day-of-month 1
    cron.schedule('0 0 1 * *', async () => {
      console.log('Starting monthly invoice generation...');
      await this.generateInvoices();
    });
    console.log('Invoice generation CRON job scheduled.');
  }

  async generateInvoices() {
    const client = await pool.connect();
    try {
      // Get previous month string (e.g., '2023-09')
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const billingPeriod = prevMonth.toISOString().substring(0, 7);

      // Get all active tenants
      const tenantsResult = await client.query("SELECT id FROM tenants WHERE status = 'active'");
      const tenants = tenantsResult.rows;

      console.log(`Found ${tenants.length} active tenants. Generating invoices for period ${billingPeriod}...`);

      for (const tenant of tenants) {
        await this.generateInvoiceForTenant(client, tenant.id, billingPeriod, prevMonth);
      }
      
      console.log('Invoice generation completed successfully.');
    } catch (error) {
      console.error('Error generating invoices:', error);
    } finally {
      client.release();
    }
  }

  async generateInvoiceForTenant(client, tenantId, billingPeriod, periodDate) {
    try {
      // Check if invoice already exists
      const existingInvoice = await client.query(
        'SELECT id FROM invoices WHERE tenant_id = $1 AND billing_period = $2',
        [tenantId, billingPeriod]
      );

      if (existingInvoice.rows.length > 0) {
        return; // Already generated
      }

      // To calculate for previous month, we temporarily override getUsageSummary logic or compute directly
      // For capstone simplicity, we'll re-implement the aggregation for the specific month here:
      
      const usageQuery = `
        SELECT usage_type, SUM(quantity) as total_quantity
        FROM usage_events
        WHERE tenant_id = $1
          AND created_at >= date_trunc('month', $2::timestamp)
          AND created_at < (date_trunc('month', $2::timestamp) + interval '1 month')
        GROUP BY usage_type
      `;
      
      const usageResult = await client.query(usageQuery, [tenantId, periodDate.toISOString()]);
      
      const usageData = {};
      usageResult.rows.forEach(row => {
        usageData[row.usage_type] = parseInt(row.total_quantity);
      });
      
      const { calculateAPICallCost } = require('../config/pricing');
      const apiCallsUsed = usageData['api_call'] || 0;
      const aiTokensUsed = usageData['ai_tokens'] || 0;
      
      const apiCallCost = calculateAPICallCost(apiCallsUsed);
      const aiTokenCost = meterService.calculateAITokenCostFromUsage(usageData);
      const totalAmount = apiCallCost + aiTokenCost;

      // Only generate invoice if there's usage or a base cost
      // (Assuming base plan cost is handled by Stripe, we invoice for usage overages / usage)
      if (totalAmount === 0) return;

      await client.query('BEGIN');

      const invoiceResult = await client.query(
        `INSERT INTO invoices (tenant_id, billing_period, amount_cents, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenantId, billingPeriod, totalAmount, 'pending']
      );
      
      const invoiceId = invoiceResult.rows[0].id;

      if (apiCallsUsed > 0) {
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id, description, quantity, amount_cents)
           VALUES ($1, $2, $3, $4)`,
          [invoiceId, 'API Calls Usage', apiCallsUsed, apiCallCost]
        );
      }

      if (aiTokensUsed > 0) {
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id, description, quantity, amount_cents)
           VALUES ($1, $2, $3, $4)`,
          [invoiceId, 'AI Tokens Usage', aiTokensUsed, aiTokenCost]
        );
      }

      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error generating invoice for tenant ${tenantId}:`, error);
    }
  }
}

module.exports = new InvoiceJob();
