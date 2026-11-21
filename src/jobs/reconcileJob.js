const cron = require('node-cron');
const pool = require('../config/database');
const stripeService = require('../services/stripeService');

/**
 * Reconciliation Job
 * Runs nightly to catch any missed Stripe webhooks by comparing Stripe state with local DB.
 * Protected by PostgreSQL advisory locks to guarantee single-execution in multi-instance clusters.
 */
class ReconcileJob {
  start() {
    // Run at 02:00 AM every day
    cron.schedule('0 2 * * *', async () => {
      console.log('[ReconcileJob] Starting nightly Stripe reconciliation trigger...');
      await this.reconcile();
    });
    console.log('Stripe reconciliation CRON job scheduled.');
  }

  async reconcile() {
    if (!stripeService.isConfigured()) {
      console.log('[ReconcileJob] Stripe reconciliation skipped: Stripe is not configured');
      return;
    }

    const client = await pool.connect();
    const LOCK_ID = 849202; // Unique 32-bit integer for reconciliation lock

    try {
      // Non-blocking advisory lock check across all cluster instances
      const lockRes = await client.query('SELECT pg_try_advisory_lock($1) as locked', [LOCK_ID]);
      if (!lockRes.rows[0].locked) {
        console.log('[ReconcileJob] Another worker instance holds the lock. Skipping duplicate execution.');
        return;
      }

      console.log('[ReconcileJob] Acquired lock. Running reconciliation across subscriptions...');
      const summary = await stripeService.reconcileAllSubscriptions();
      console.log(`[ReconcileJob] Reconciliation complete. Processed ${summary.total_tenants} tenants.`);
    } catch (error) {
      console.error('[ReconcileJob] Error during reconciliation job:', error.message);
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

module.exports = new ReconcileJob();
