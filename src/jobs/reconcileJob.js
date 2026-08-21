const cron = require('node-cron');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');

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
    const client = await pool.connect();
    try {
      // 1. Get all tenants with a stripe_customer_id
      const tenantsResult = await client.query(
        "SELECT id, stripe_customer_id, plan_id, status FROM tenants WHERE stripe_customer_id IS NOT NULL"
      );
      
      let syncCount = 0;
      let errorCount = 0;

      for (const tenant of tenantsResult.rows) {
        try {
          await this.reconcileTenant(client, tenant);
          syncCount++;
        } catch (err) {
          console.error(`Reconciliation failed for tenant ${tenant.id}:`, err);
          errorCount++;
        }
      }

      console.log(`Reconciliation complete. Synced: ${syncCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error('Error during reconciliation job:', error);
    } finally {
      client.release();
    }
  }

  async reconcileTenant(client, tenant) {
    // 1. Fetch active subscriptions from Stripe
    const stripeSubs = await stripe.subscriptions.list({
      customer: tenant.stripe_customer_id,
      status: 'active',
      limit: 1
    });
    
    const activeStripeSub = stripeSubs.data.length > 0 ? stripeSubs.data[0] : null;

    // 2. Fetch our DB subscription
    const dbSubResult = await client.query(
      "SELECT id, stripe_subscription_id, status, plan_id FROM subscriptions WHERE tenant_id = $1 AND status = 'active'",
      [tenant.id]
    );
    const dbSub = dbSubResult.rows.length > 0 ? dbSubResult.rows[0] : null;

    // Case A: Stripe has an active sub, but we don't (missed checkout webhook)
    if (activeStripeSub && !dbSub) {
      console.log(`[RECONCILE] Syncing missing active subscription for tenant ${tenant.id}`);
      
      // Determine plan from Stripe Price ID
      const priceId = activeStripeSub.items.data[0].price.id;
      let planName = 'Free';
      if (priceId === 'price_pro_plan_id') planName = 'Pro';
      
      const planResult = await client.query("SELECT id FROM plans WHERE name = $1", [planName]);
      const planId = planResult.rows[0].id;

      await client.query('BEGIN');
      
      await client.query(
        `INSERT INTO subscriptions 
         (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
         ON CONFLICT (tenant_id, stripe_subscription_id) DO UPDATE 
         SET status = EXCLUDED.status, plan_id = EXCLUDED.plan_id`,
        [
          tenant.id, 
          activeStripeSub.id, 
          activeStripeSub.status, 
          planId,
          activeStripeSub.current_period_start,
          activeStripeSub.current_period_end
        ]
      );
      
      await client.query("UPDATE tenants SET plan_id = $1, status = 'active' WHERE id = $2", [planId, tenant.id]);
      await client.query('COMMIT');
    }
    
    // Case B: We have an active sub, but Stripe says it's canceled (missed deleted webhook)
    else if (!activeStripeSub && dbSub) {
      console.log(`[RECONCILE] Canceling stale subscription for tenant ${tenant.id}`);
      
      const freePlanResult = await client.query("SELECT id FROM plans WHERE name = 'Free'");
      const freePlanId = freePlanResult.rows[0].id;
      
      await client.query('BEGIN');
      await client.query("UPDATE subscriptions SET status = 'canceled' WHERE id = $1", [dbSub.id]);
      await client.query("UPDATE tenants SET plan_id = $1 WHERE id = $2", [freePlanId, tenant.id]);
      await client.query('COMMIT');
    }
    
    // Case C: Plan mismatch (e.g. upgraded but missed webhook)
    else if (activeStripeSub && dbSub) {
      // In a real implementation, we would compare the priceId with the plan_id
      // For simplicity here, we'll just ensure current_period_end is synced
      
      const dbEnd = new Date(dbSub.current_period_end).getTime() / 1000;
      if (Math.abs(dbEnd - activeStripeSub.current_period_end) > 86400) { // 1 day difference
        console.log(`[RECONCILE] Updating subscription period for tenant ${tenant.id}`);
        await client.query(
          "UPDATE subscriptions SET current_period_end = to_timestamp($1) WHERE id = $2",
          [activeStripeSub.current_period_end, dbSub.id]
        );
      }
    }
  }
}

module.exports = new ReconcileJob();
