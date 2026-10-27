const cron = require('node-cron');
const stripeService = require('../services/stripeService');

/**
 * Reconciliation Job
 * Runs nightly to catch any missed Stripe webhooks by comparing Stripe state with our DB
 */
class ReconcileJob {
  start() {
    // Run at 02:00 AM every day
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting nightly Stripe reconciliation...');
      await this.reconcile();
    });
    console.log('Stripe reconciliation CRON job scheduled.');
  }

  async reconcile() {
    if (!stripeService.isConfigured()) {
      console.log('Stripe reconciliation skipped: Stripe is not configured');
      return;
    }

    try {
      const summary = await stripeService.reconcileAllSubscriptions();
      console.log(`Reconciliation complete. Processed ${summary.total_tenants} tenants.`);
    } catch (error) {
      console.error('Error during reconciliation job:', error.message);
    }
  }
}

module.exports = new ReconcileJob();
