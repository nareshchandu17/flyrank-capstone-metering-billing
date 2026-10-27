const cron = require('node-cron');
const pool = require('../config/database');
const invoiceService = require('../services/invoiceService');

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
    try {
      // Get previous month string (e.g., '2026-09')
      const now = new Date();
      const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const year = prevMonth.getUTCFullYear();
      const month = String(prevMonth.getUTCMonth() + 1).padStart(2, '0');
      const billingPeriod = `${year}-${month}`;

      // Get all active tenants
      const tenantsResult = await pool.query("SELECT id FROM tenants WHERE status = 'active'");
      const tenants = tenantsResult.rows;

      console.log(`Found ${tenants.length} active tenants. Generating invoices for period ${billingPeriod}...`);

      for (const tenant of tenants) {
        try {
          await invoiceService.generateInvoice(tenant.id, billingPeriod);
        } catch (err) {
          console.error(`Error generating invoice for tenant ${tenant.id}:`, err.message);
        }
      }
      
      console.log('Monthly invoice generation completed.');
    } catch (error) {
      console.error('Error during monthly invoice job:', error);
    }
  }
}

module.exports = new InvoiceJob();
