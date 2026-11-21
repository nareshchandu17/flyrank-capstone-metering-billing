const cron = require('node-cron');
const pool = require('../config/database');
const invoiceService = require('../services/invoiceService');

/**
 * Invoice Job
 * Runs on the 1st of every month to generate invoices for the previous month.
 * Protected by PostgreSQL advisory locks to guarantee single-execution in multi-instance clusters.
 */
class InvoiceJob {
  start() {
    // Run at 00:00 on day-of-month 1
    cron.schedule('0 0 1 * *', async () => {
      console.log('[InvoiceJob] Starting monthly invoice generation trigger...');
      await this.generateInvoices();
    });
    console.log('Invoice generation CRON job scheduled.');
  }

  async generateInvoices() {
    const client = await pool.connect();
    const LOCK_ID = 849201; // Unique 32-bit integer for invoice generation lock

    try {
      // Non-blocking advisory lock check across all cluster instances
      const lockRes = await client.query('SELECT pg_try_advisory_lock($1) as locked', [LOCK_ID]);
      if (!lockRes.rows[0].locked) {
        console.log('[InvoiceJob] Another worker instance holds the lock. Skipping duplicate execution.');
        return;
      }

      // Get previous month string (e.g., '2026-09')
      const now = new Date();
      const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const year = prevMonth.getUTCFullYear();
      const month = String(prevMonth.getUTCMonth() + 1).padStart(2, '0');
      const billingPeriod = `${year}-${month}`;

      // Get all active tenants
      const tenantsResult = await client.query("SELECT id FROM tenants WHERE status = 'active'");
      const tenants = tenantsResult.rows;

      console.log(`[InvoiceJob] Acquired lock. Generating invoices for ${tenants.length} active tenants for period ${billingPeriod}...`);

      for (const tenant of tenants) {
        try {
          await invoiceService.generateInvoice(tenant.id, billingPeriod);
        } catch (err) {
          console.error(`[InvoiceJob] Error generating invoice for tenant ${tenant.id}:`, err.message);
        }
      }

      console.log('[InvoiceJob] Monthly invoice generation completed successfully.');
    } catch (error) {
      console.error('[InvoiceJob] Error during monthly invoice job:', error);
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
      } catch {
        // Ignored
      }
      client.release();
    }
  }
}

module.exports = new InvoiceJob();
