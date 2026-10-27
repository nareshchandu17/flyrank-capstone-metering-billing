const pool = require('../config/database');

class StripeService {
  /**
   * Helper to retrieve an initialized Stripe instance or null if not configured
   */
  getStripeClient() {
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }
    return require('stripe')(process.env.STRIPE_SECRET_KEY);
  }

  /**
   * Check if Stripe integration is configured
   */
  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  /**
   * Resolve configurable Stripe price ID for a given plan
   * @param {string} planName - 'Free' or 'Pro'
   * @returns {string|null} Stripe price ID
   */
  getPriceId(planName) {
    const priceMap = {
      'Free': process.env.STRIPE_PRICE_FREE || process.env.STRIPE_PRICE_FREE_ID || 'price_free_plan_id',
      'Pro': process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO_ID || 'price_pro_plan_id'
    };
    return priceMap[planName] || null;
  }

  /**
   * Resolve plan name from a given Stripe Price ID
   * @param {string} priceId - Stripe Price ID
   * @returns {string} Plan name ('Free' or 'Pro')
   */
  getPlanNameFromPriceId(priceId) {
    const proPriceId = this.getPriceId('Pro');
    if (priceId && priceId === proPriceId) {
      return 'Pro';
    }
    return 'Free';
  }

  /**
   * Create a Stripe checkout session for subscription
   * @param {string} tenantId - Tenant UUID
   * @param {string} planName - Plan name ('Free' or 'Pro')
   * @returns {Object} - Checkout session URL and ID
   */
  async createCheckoutSession(tenantId, planName) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      const err = new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
      err.statusCode = 503;
      throw err;
    }

    try {
      // Get tenant info
      const tenantResult = await pool.query(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const tenant = tenantResult.rows[0];
      
      const priceId = this.getPriceId(planName);
      if (!priceId) {
        throw new Error('Invalid plan name');
      }
      
      // Create or get Stripe customer
      let stripeCustomerId = tenant.stripe_customer_id;
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: tenant.email,
          name: tenant.name,
          metadata: {
            tenant_id: tenantId
          }
        });
        
        stripeCustomerId = customer.id;
        
        // Update tenant with Stripe customer ID
        await pool.query(
          'UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, tenantId]
        );
      }
      
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.SUCCESS_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CANCEL_URL || 'http://localhost:3000'}/cancel`,
        metadata: {
          tenant_id: tenantId,
          plan_name: planName
        }
      });
      
      return {
        url: session.url,
        sessionId: session.id
      };
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
  
  /**
   * Upgrade an existing subscription (handles proration automatically via Stripe)
   * @param {string} tenantId - Tenant UUID
   * @param {string} newPlanName - Plan name ('Free' or 'Pro')
   * @returns {Object} - Result of upgrade
   */
  async upgradeSubscription(tenantId, newPlanName) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      const err = new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
      err.statusCode = 503;
      throw err;
    }

    try {
      const tenantResult = await pool.query(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const tenant = tenantResult.rows[0];
      
      const subResult = await pool.query(
        'SELECT * FROM subscriptions WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'active']
      );
      
      if (subResult.rows.length === 0) {
        throw new Error('No active subscription found to upgrade. Use checkout instead.');
      }
      
      const subscription = subResult.rows[0];
      const priceId = this.getPriceId(newPlanName);
      if (!priceId) {
        throw new Error('Invalid plan name');
      }
      
      // Get subscription from Stripe to find subscription item ID
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      
      const updatedSub = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          items: [{
            id: stripeSub.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
        }
      );
      
      // Update DB
      const planResult = await pool.query('SELECT id FROM plans WHERE name = $1', [newPlanName]);
      if (planResult.rows.length > 0) {
        const planId = planResult.rows[0].id;
        
        await pool.query(
          'UPDATE tenants SET plan_id = $1 WHERE id = $2',
          [planId, tenantId]
        );
        
        await pool.query(
          'UPDATE subscriptions SET plan_id = $1 WHERE id = $2',
          [planId, subscription.id]
        );
      }
      
      return {
        success: true,
        message: 'Subscription upgraded successfully. Proration applied.',
        stripe_subscription_id: updatedSub.id
      };
      
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }
  
  /**
   * Handle Stripe webhook events with replay-safe verification
   * @param {string} signature - Stripe signature header
   * @param {string|Buffer} payload - Raw webhook payload Buffer or string
   * @returns {Object} - Event processing result
   */
  async handleWebhook(signature, payload) {
    const stripe = this.getStripeClient();
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return {
        status: 'error',
        message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
        statusCode: 503
      };
    }

    let event;
    
    try {
      // Verify webhook signature with raw payload Buffer/string
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return {
        status: 'error',
        message: 'Invalid signature',
        statusCode: 400
      };
    }
    
    // Handle different event types
    if (!event || !event.type) {
      return {
        status: 'error',
        message: 'Invalid event format',
        statusCode: 400
      };
    }

    // 1. Replay Safety: Deduplicate incoming events at the DB level
    if (event.id) {
      const recordResult = await pool.query(
        `INSERT INTO webhook_events (stripe_event_id, event_type)
         VALUES ($1, $2)
         ON CONFLICT (stripe_event_id) DO NOTHING
         RETURNING id`,
        [event.id, event.type]
      );

      if (recordResult.rows.length === 0) {
        return {
          status: 'duplicate',
          message: 'Webhook event already processed'
        };
      }
    }
    
    switch (event.type) {
      case 'checkout.session.completed':
        return await this.handleCheckoutSessionCompleted(event.data.object, event.id);
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return await this.handleSubscriptionUpdated(event.data.object);
      
      case 'customer.subscription.deleted':
        return await this.handleSubscriptionDeleted(event.data.object);

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        return await this.handleInvoicePaid(event.data.object);

      case 'invoice.payment_failed':
        return await this.handleInvoicePaymentFailed(event.data.object);
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return {
          status: 'ignored',
          message: 'Event type not handled'
        };
    }
  }
  
  /**
   * Handle checkout.session.completed event
   * @param {Object} session - Stripe session object
   * @param {string} [eventId] - Optional Stripe event ID
   * @returns {Object} - Processing result
   */
  async handleCheckoutSessionCompleted(session, eventId = null) {
    const client = await pool.connect();
    const stripe = this.getStripeClient();
    
    try {
      await client.query('BEGIN');
      
      const tenantId = session.metadata?.tenant_id;
      const planName = session.metadata?.plan_name || 'Pro';
      
      // Check for duplicate subscription processing
      if (session.subscription) {
        const existingSubscription = await client.query(
          'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
          [session.subscription]
        );
        
        if (existingSubscription.rows.length > 0) {
          await client.query('ROLLBACK');
          return {
            status: 'duplicate',
            message: 'Subscription already processed'
          };
        }
      }
      
      // Get plan ID from plan name
      const planResult = await client.query(
        'SELECT id FROM plans WHERE name = $1',
        [planName]
      );
      
      if (planResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Plan "${planName}" not found in database`);
      }
      
      const planId = planResult.rows[0].id;
      
      // Get subscription details from Stripe
      let subscription = { 
        id: session.subscription, 
        status: 'active', 
        current_period_start: Math.floor(Date.now() / 1000), 
        current_period_end: Math.floor(Date.now() / 1000) + 2592000 
      };

      if (stripe && stripe.subscriptions && typeof stripe.subscriptions.retrieve === 'function' && session.subscription) {
        try {
          subscription = await stripe.subscriptions.retrieve(session.subscription);
        } catch (subErr) {
          console.warn('Could not retrieve subscription details from Stripe SDK; using fallback values:', subErr.message);
        }
      }
      
      // Create subscription record
      if (session.subscription) {
        await client.query(
          `INSERT INTO subscriptions 
           (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
           VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
           ON CONFLICT (tenant_id, stripe_subscription_id) DO UPDATE
           SET status = EXCLUDED.status, plan_id = EXCLUDED.plan_id, current_period_end = EXCLUDED.current_period_end`,
          [
            tenantId,
            subscription.id,
            subscription.status || 'active',
            planId,
            subscription.current_period_start,
            subscription.current_period_end
          ]
        );
      }
      
      // Update tenant's plan and status to active
      await client.query(
        `UPDATE tenants 
         SET plan_id = $1, 
             status = 'active',
             stripe_customer_id = COALESCE(stripe_customer_id, $2)
         WHERE id = $3`,
        [planId, session.customer || null, tenantId]
      );
      
      await client.query('COMMIT');
      
      return {
        status: 'success',
        message: 'Subscription created successfully'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling checkout.session.completed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Handle customer.subscription.updated event
   * @param {Object} subscription - Stripe subscription object
   * @returns {Object} - Processing result
   */
  async handleSubscriptionUpdated(subscription) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if subscription exists
      const existingSubscription = await client.query(
        'SELECT id, tenant_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
      );
      
      if (existingSubscription.rows.length === 0) {
        // If not found by subscription ID, try finding tenant by customer ID
        let tenantId = null;
        if (subscription.customer) {
          const tenantByCust = await client.query(
            'SELECT id FROM tenants WHERE stripe_customer_id = $1',
            [subscription.customer]
          );
          if (tenantByCust.rows.length > 0) {
            tenantId = tenantByCust.rows[0].id;
          }
        }

        if (!tenantId) {
          await client.query('ROLLBACK');
          return {
            status: 'not_found',
            message: 'Subscription not found in database'
          };
        }

        // Insert missing subscription record
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planName = this.getPlanNameFromPriceId(priceId);
        const planRes = await client.query('SELECT id FROM plans WHERE name = $1', [planName]);
        const planId = planRes.rows[0]?.id;

        await client.query(
          `INSERT INTO subscriptions 
           (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
           VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))`,
          [
            tenantId,
            subscription.id,
            subscription.status,
            planId,
            subscription.current_period_start,
            subscription.current_period_end
          ]
        );
      } else {
        // Update subscription status and period
        await client.query(
          `UPDATE subscriptions 
           SET status = $1, 
               current_period_start = to_timestamp($2),
               current_period_end = to_timestamp($3),
               updated_at = CURRENT_TIMESTAMP
           WHERE stripe_subscription_id = $4`,
          [
            subscription.status,
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.id
          ]
        );
      }
      
      // Update tenant status and plan if price changed
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const subRecord = await client.query(
        'SELECT tenant_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
      );
      const tenantId = subRecord.rows[0]?.tenant_id;

      if (tenantId) {
        let tenantStatus = 'active';
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          tenantStatus = 'inactive';
        } else if (subscription.status === 'past_due') {
          tenantStatus = 'past_due';
        }

        const planName = this.getPlanNameFromPriceId(priceId);
        const planRes = await client.query('SELECT id FROM plans WHERE name = $1', [planName]);
        const planId = planRes.rows[0]?.id;

        await client.query(
          `UPDATE tenants 
           SET status = $1,
               plan_id = COALESCE($2, plan_id),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [tenantStatus, planId, tenantId]
        );
      }
      
      await client.query('COMMIT');
      
      return {
        status: 'success',
        message: 'Subscription updated successfully'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling customer.subscription.updated:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Handle customer.subscription.deleted event
   * @param {Object} subscription - Stripe subscription object
   * @returns {Object} - Processing result
   */
  async handleSubscriptionDeleted(subscription) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingSubscription = await client.query(
        'SELECT tenant_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
      );
      
      if (existingSubscription.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          status: 'not_found',
          message: 'Subscription not found in database'
        };
      }
      
      const tenantId = existingSubscription.rows[0].tenant_id;
      
      // Update subscription status to canceled
      await client.query(
        'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $2',
        ['canceled', subscription.id]
      );
      
      // Move tenant back to Free plan
      const freePlanResult = await client.query(
        'SELECT id FROM plans WHERE name = $1',
        ['Free']
      );
      
      if (freePlanResult.rows.length > 0) {
        await client.query(
          'UPDATE tenants SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [freePlanResult.rows[0].id, tenantId]
        );
      }
      
      await client.query('COMMIT');
      
      return {
        status: 'success',
        message: 'Subscription canceled successfully'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling customer.subscription.deleted:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle invoice.paid / invoice.payment_succeeded event
   * @param {Object} invoice - Stripe invoice object
   * @returns {Object}
   */
  async handleInvoicePaid(invoice) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stripeInvoiceId = invoice.id;
      const paymentIntentId = invoice.payment_intent;
      const paidAt = invoice.status_transitions?.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000) 
        : new Date();

      // Update matching local invoice
      const updatedInvoice = await client.query(
        `UPDATE invoices 
         SET status = 'paid', 
             stripe_payment_intent_id = COALESCE($1, stripe_payment_intent_id),
             paid_at = COALESCE($2, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_invoice_id = $3
         RETURNING id, tenant_id, billing_period`,
        [paymentIntentId, paidAt, stripeInvoiceId]
      );

      // If it's a subscription renewal invoice, update subscription current_period
      if (invoice.subscription && invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
        const linePeriod = invoice.lines.data[0].period;
        if (linePeriod && linePeriod.start && linePeriod.end) {
          await client.query(
            `UPDATE subscriptions 
             SET current_period_start = to_timestamp($1),
                 current_period_end = to_timestamp($2),
                 status = 'active',
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_subscription_id = $3`,
            [linePeriod.start, linePeriod.end, invoice.subscription]
          );
        }
      }

      await client.query('COMMIT');
      return {
        status: 'success',
        message: 'Invoice payment recorded successfully',
        invoice_id: updatedInvoice.rows[0]?.id || null
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling invoice.paid:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle invoice.payment_failed event
   * @param {Object} invoice - Stripe invoice object
   * @returns {Object}
   */
  async handleInvoicePaymentFailed(invoice) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE invoices 
         SET status = 'payment_failed', 
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_invoice_id = $1`,
        [invoice.id]
      );

      if (invoice.subscription) {
        const subRes = await client.query(
          `UPDATE subscriptions 
           SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
           WHERE stripe_subscription_id = $1
           RETURNING tenant_id`,
          [invoice.subscription]
        );

        if (subRes.rows.length > 0) {
          await client.query(
            `UPDATE tenants SET status = 'past_due', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [subRes.rows[0].tenant_id]
          );
        }
      }

      await client.query('COMMIT');
      return {
        status: 'success',
        message: 'Invoice payment failure recorded'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling invoice.payment_failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reconcile a single tenant's subscription state with Stripe
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Reconciliation summary
   */
  async reconcileTenantSubscription(tenantId) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      return {
        reconciled: false,
        reason: 'Stripe is not configured'
      };
    }

    const client = await pool.connect();
    const changes = [];

    try {
      const tenantRes = await client.query(
        'SELECT id, name, stripe_customer_id, plan_id, status FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (tenantRes.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      const tenant = tenantRes.rows[0];
      if (!tenant.stripe_customer_id) {
        return {
          reconciled: true,
          tenant_id: tenantId,
          changes: [],
          message: 'No Stripe customer ID associated with tenant'
        };
      }

      // Fetch active subscriptions from Stripe
      const stripeSubs = await stripe.subscriptions.list({
        customer: tenant.stripe_customer_id,
        status: 'all',
        limit: 1
      });

      const activeStripeSub = stripeSubs.data.length > 0 ? stripeSubs.data[0] : null;

      // Fetch local DB subscription
      const dbSubRes = await client.query(
        "SELECT id, stripe_subscription_id, status, plan_id, current_period_end FROM subscriptions WHERE tenant_id = $1 AND status != 'canceled' ORDER BY created_at DESC LIMIT 1",
        [tenantId]
      );
      const dbSub = dbSubRes.rows.length > 0 ? dbSubRes.rows[0] : null;

      // Case A: Stripe has an active subscription, but DB is missing it or out-of-sync
      if (activeStripeSub && activeStripeSub.status === 'active') {
        const priceId = activeStripeSub.items?.data?.[0]?.price?.id;
        const planName = this.getPlanNameFromPriceId(priceId);
        const planRes = await client.query('SELECT id FROM plans WHERE name = $1', [planName]);
        const planId = planRes.rows[0]?.id;

        await client.query('BEGIN');

        if (!dbSub || dbSub.stripe_subscription_id !== activeStripeSub.id) {
          await client.query(
            `INSERT INTO subscriptions 
             (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
             ON CONFLICT (tenant_id, stripe_subscription_id) DO UPDATE 
             SET status = EXCLUDED.status, plan_id = EXCLUDED.plan_id, current_period_end = EXCLUDED.current_period_end`,
            [
              tenant.id,
              activeStripeSub.id,
              activeStripeSub.status,
              planId,
              activeStripeSub.current_period_start,
              activeStripeSub.current_period_end
            ]
          );
          changes.push('inserted_or_synced_subscription');
        } else {
          // Check for period end or status drift
          const dbEnd = new Date(dbSub.current_period_end).getTime() / 1000;
          if (Math.abs(dbEnd - activeStripeSub.current_period_end) > 60 || dbSub.status !== 'active') {
            await client.query(
              `UPDATE subscriptions 
               SET status = 'active', current_period_end = to_timestamp($1), plan_id = $2, updated_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [activeStripeSub.current_period_end, planId, dbSub.id]
            );
            changes.push('updated_subscription_period_and_status');
          }
        }

        // Ensure tenant has correct plan and active status
        if (tenant.plan_id !== planId || tenant.status !== 'active') {
          await client.query(
            "UPDATE tenants SET plan_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [planId, tenant.id]
          );
          changes.push(`updated_tenant_plan_to_${planName}`);
        }

        await client.query('COMMIT');
      }

      // Case B: Stripe subscription is canceled/missing, but DB has active subscription
      else if ((!activeStripeSub || activeStripeSub.status === 'canceled') && dbSub && dbSub.status === 'active') {
        const freePlanResult = await client.query("SELECT id FROM plans WHERE name = 'Free'");
        const freePlanId = freePlanResult.rows[0]?.id;

        await client.query('BEGIN');
        await client.query(
          "UPDATE subscriptions SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [dbSub.id]
        );
        await client.query(
          "UPDATE tenants SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [freePlanId, tenant.id]
        );
        changes.push('canceled_subscription_and_downgraded_to_free');
        await client.query('COMMIT');
      }

      return {
        reconciled: true,
        tenant_id: tenantId,
        changes: changes,
        synced: changes.length > 0
      };

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Reconciliation error for tenant ${tenantId}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reconcile all tenants having a Stripe customer ID
   * @returns {Promise<Object>}
   */
  async reconcileAllSubscriptions() {
    const tenantsResult = await pool.query(
      'SELECT id FROM tenants WHERE stripe_customer_id IS NOT NULL'
    );

    const results = [];
    for (const row of tenantsResult.rows) {
      try {
        const res = await this.reconcileTenantSubscription(row.id);
        results.push(res);
      } catch (err) {
        results.push({ tenant_id: row.id, error: err.message });
      }
    }

    return {
      total_tenants: tenantsResult.rows.length,
      reconciled_results: results
    };
  }
}

module.exports = new StripeService();
