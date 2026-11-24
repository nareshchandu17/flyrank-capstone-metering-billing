const pool = require('../config/database');

class StripeService {
  constructor() {
    this._priceIdCache = new Map();
  }

  /**
   * Helper to retrieve an initialized Stripe instance or null if not configured
   */
  getStripeClient() {
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }
    return require('stripe')(process.env.STRIPE_SECRET_KEY.trim());
  }

  /**
   * Check if Stripe integration is configured
   */
  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  /**
   * Validate Stripe test-mode configuration.
   * Ensures test-mode secret key, webhook secret, and configured Price IDs are valid.
   * Throws informative errors if configuration is missing or invalid.
   */
  async validateStripeConfig() {
    const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
    }

    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      throw new Error('Invalid Stripe configuration: STRIPE_SECRET_KEY must start with sk_test_ or sk_live_');
    }

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured in environment variables');
    }

    if (!webhookSecret.startsWith('whsec_')) {
      throw new Error('Invalid Stripe configuration: STRIPE_WEBHOOK_SECRET must start with whsec_');
    }

    const freePriceId = this.getPriceId('Free');
    const proPriceId = this.getPriceId('Pro');

    if (!freePriceId) {
      throw new Error('STRIPE_PRICE_FREE is not configured. Set STRIPE_PRICE_FREE in .env');
    }

    if (!proPriceId) {
      throw new Error('STRIPE_PRICE_PRO is not configured. Set STRIPE_PRICE_PRO in .env');
    }

    if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) {
      throw new Error('Production configuration error: APP_URL must be configured in environment variables for Stripe redirection');
    }

    // Verify against Stripe API if client is available
    const stripe = this.getStripeClient();
    if (stripe) {
      try {
        const resolvedProPriceId = await this.resolvePriceId('Pro');
        if (resolvedProPriceId && resolvedProPriceId.startsWith('price_')) {
          const proPrice = await stripe.prices.retrieve(resolvedProPriceId);
          if (!proPrice || !proPrice.recurring) {
            console.warn(`[StripeConfig] Warning: Pro Price ${resolvedProPriceId} is not a recurring subscription price.`);
          }
        }
      } catch (err) {
        console.warn(`[StripeConfig] Notice during price verification: ${err.message}`);
      }
    }

    return {
      valid: true,
      freePriceId,
      proPriceId
    };
  }

  /**
   * Asynchronously resolve a plan to a Stripe price ID.
   * If configured as a Product ID (prod_...), queries Stripe API to retrieve
   * the product's default_price or first active price, and caches it.
   *
   * @param {string} planName - 'Free' or 'Pro'
   * @returns {Promise<string|null>}
   */
  async resolvePriceId(planName) {
    if (!planName) return null;
    const normalizedName = planName.trim();

    if (this._priceIdCache.has(normalizedName)) {
      return this._priceIdCache.get(normalizedName);
    }

    let rawConfigured = null;
    if (normalizedName === 'Free') {
      rawConfigured = (process.env.STRIPE_PRICE_FREE || process.env.STRIPE_PRICE_FREE_ID || '').trim();
    } else if (normalizedName === 'Pro') {
      rawConfigured = (process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO_ID || '').trim();
    }

    if (!rawConfigured || rawConfigured === 'price_free_plan_id' || rawConfigured === 'price_pro_plan_id') {
      return null;
    }

    // Direct price or plan ID
    if (rawConfigured.startsWith('price_') || rawConfigured.startsWith('plan_')) {
      this._priceIdCache.set(normalizedName, rawConfigured);
      return rawConfigured;
    }

    // Product ID: dynamically look up active price in Stripe
    if (rawConfigured.startsWith('prod_')) {
      const stripe = this.getStripeClient();
      if (stripe) {
        try {
          const product = await stripe.products.retrieve(rawConfigured);
          const defaultPriceId = typeof product.default_price === 'string'
            ? product.default_price
            : product.default_price?.id;

          if (defaultPriceId) {
            this._priceIdCache.set(normalizedName, defaultPriceId);
            return defaultPriceId;
          }

          const prices = await stripe.prices.list({ product: rawConfigured, active: true, limit: 1 });
          if (prices.data && prices.data.length > 0) {
            const priceId = prices.data[0].id;
            this._priceIdCache.set(normalizedName, priceId);
            return priceId;
          }
        } catch (err) {
          console.warn(`[StripeService] Notice: Could not resolve price from product ${rawConfigured}: ${err.message}`);
        }
      }
    }

    this._priceIdCache.set(normalizedName, rawConfigured);
    return rawConfigured;
  }

  /**
   * Resolve configurable Stripe price ID for a given plan.
   * Strips whitespace, removes mock fallbacks, and safely handles product-to-price mapping if needed.
   * 
   * @param {string} planName - 'Free' or 'Pro'
   * @returns {string|null} Stripe price ID
   */
  getPriceId(planName) {
    if (!planName) return null;

    const normalizedName = planName.trim();
    if (this._priceIdCache.has(normalizedName)) {
      return this._priceIdCache.get(normalizedName);
    }

    let configuredPrice = null;

    if (normalizedName === 'Free') {
      configuredPrice = (process.env.STRIPE_PRICE_FREE || process.env.STRIPE_PRICE_FREE_ID || '').trim();
    } else if (normalizedName === 'Pro') {
      configuredPrice = (process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO_ID || '').trim();
    }

    // Reject fake placeholders
    if (!configuredPrice || configuredPrice === 'price_free_plan_id' || configuredPrice === 'price_pro_plan_id') {
      return null;
    }

    // If user provided a prod_... Product ID, resolve configured price ID mapping
    if (configuredPrice.startsWith('prod_')) {
      if (process.env.STRIPE_PRODUCT_PRO_ID && configuredPrice === process.env.STRIPE_PRODUCT_PRO_ID) {
        return (process.env.STRIPE_PRICE_PRO || '').trim();
      }
      if (process.env.STRIPE_PRODUCT_FREE_ID && configuredPrice === process.env.STRIPE_PRODUCT_FREE_ID) {
        return (process.env.STRIPE_PRICE_FREE || '').trim();
      }
    }

    return configuredPrice;
  }

  /**
   * Resolve plan name from a given Stripe Price ID or Product ID
   * @param {string} priceId - Stripe Price ID or Product ID
   * @returns {string} Plan name ('Free' or 'Pro')
   */
  getPlanNameFromPriceId(priceId) {
    if (!priceId) return 'Free';
    const trimmed = priceId.trim();
    const proPriceId = this.getPriceId('Pro');

    if (trimmed === proPriceId || (process.env.STRIPE_PRODUCT_PRO_ID && trimmed === process.env.STRIPE_PRODUCT_PRO_ID)) {
      return 'Pro';
    }
    return 'Free';
  }

  /**
   * Safe, idempotent retrieval or creation of a genuine Stripe customer
   * @param {Object} tenant - Database tenant record
   * @param {Object} [client] - Optional database pool client for transactions
   * @returns {Promise<string>} - Stripe customer ID
   */
  async getOrCreateCustomer(tenant, client = pool) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.');
    }

    let customerId = tenant.stripe_customer_id;

    // 1. If tenant already has a customer ID, verify it exists in Stripe
    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if (existingCustomer && !existingCustomer.deleted) {
          return existingCustomer.id;
        }
      } catch (err) {
        console.warn(`Customer ${customerId} not found in Stripe; searching by email...`);
      }
    }

    // 2. Search Stripe by email to avoid duplicate customer creation
    if (tenant.email) {
      const searchRes = await stripe.customers.list({
        email: tenant.email,
        limit: 1
      });

      if (searchRes.data.length > 0 && !searchRes.data[0].deleted) {
        customerId = searchRes.data[0].id;
        await client.query(
          'UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2',
          [customerId, tenant.id]
        );
        return customerId;
      }
    }

    // 3. Create customer idempotently with stable tenant metadata
    const newCustomer = await stripe.customers.create(
      {
        email: tenant.email,
        name: tenant.name,
        metadata: {
          tenant_id: tenant.id
        }
      },
      {
        idempotencyKey: `cus_${tenant.id}`
      }
    );

    customerId = newCustomer.id;

    // Save to database
    await client.query(
      'UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2',
      [customerId, tenant.id]
    );

    return customerId;
  }

  /**
   * Create a Stripe Customer Billing Portal session.
   * Enables self-service payment method updates, invoice history inspection, and receipts.
   * 
   * @param {string} tenantId - Tenant UUID
   * @param {string} [returnUrl] - Redirect URL after portal session
   * @returns {Promise<{ url: string }>}
   */
  async createCustomerPortalSession(tenantId, returnUrl) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      const err = new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
      err.statusCode = 503;
      throw err;
    }

    const tenantResult = await pool.query(
      'SELECT id, name, email, stripe_customer_id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      const err = new Error('Tenant not found');
      err.statusCode = 404;
      throw err;
    }

    const tenant = tenantResult.rows[0];
    const customerId = await this.getOrCreateCustomer(tenant);

    let defaultReturnUrl = returnUrl || process.env.STRIPE_PORTAL_RETURN_URL;
    if (!defaultReturnUrl) {
      if (process.env.APP_URL) {
        defaultReturnUrl = `${process.env.APP_URL.replace(/\/$/, '')}/dashboard/history`;
      } else if (process.env.NODE_ENV === 'production') {
        const err = new Error('Production configuration error: APP_URL or STRIPE_PORTAL_RETURN_URL must be configured in environment variables.');
        err.statusCode = 500;
        throw err;
      } else {
        defaultReturnUrl = 'http://localhost:5173/dashboard/history';
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: defaultReturnUrl,
    });

    return { url: portalSession.url };
  }

  /**
   * Create a Stripe checkout session for subscription.
   * Completely enforces tenant scoping and attaches required metadata.
   * 
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

    // 1. Get tenant info
    const tenantResult = await pool.query(
      'SELECT id, name, email, stripe_customer_id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      const err = new Error('Tenant not found');
      err.statusCode = 404;
      throw err;
    }

    const tenant = tenantResult.rows[0];

    const priceId = (await this.resolvePriceId(planName)) || this.getPriceId(planName);
    if (!priceId) {
      const err = new Error(`Stripe Price ID for plan "${planName}" is not configured. Ensure STRIPE_PRICE_${planName.toUpperCase()} is configured in .env.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Safely create or reuse Stripe customer
    const stripeCustomerId = await this.getOrCreateCustomer(tenant);

    // 3. URLs from environment configuration
    let defaultAppUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : null;
    if (!defaultAppUrl) {
      if (process.env.NODE_ENV === 'production') {
        const err = new Error('Production configuration error: APP_URL must be configured in environment variables for Stripe checkout redirection.');
        err.statusCode = 500;
        throw err;
      }
      defaultAppUrl = 'http://localhost:5173';
    }
    const successUrl = process.env.STRIPE_SUCCESS_URL || `${defaultAppUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&checkout=success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${defaultAppUrl}/dashboard?checkout=cancelled`;

    // 4. Stable idempotency key for checkout session creation (scoped per tenant, plan, and hour)
    const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const idempotencyKey = `cs_${tenantId}_${planName}_${hourBucket}`;

    const session = await stripe.checkout.sessions.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: tenantId,
        metadata: {
          tenant_id: tenantId,
          plan_name: planName
        },
        subscription_data: {
          metadata: {
            tenant_id: tenantId,
            plan_name: planName
          }
        }
      },
      {
        idempotencyKey
      }
    );

    return {
      url: session.url,
      sessionId: session.id
    };
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

    const tenantResult = await pool.query(
      'SELECT id, name, email, stripe_customer_id, plan_id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      const err = new Error('Tenant not found');
      err.statusCode = 404;
      throw err;
    }

    const tenant = tenantResult.rows[0];

    const subResult = await pool.query(
      "SELECT id, stripe_subscription_id, status FROM subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [tenantId]
    );

    if (subResult.rows.length === 0 || !subResult.rows[0].stripe_subscription_id) {
      const err = new Error('No active subscription found to upgrade. Please initiate a checkout session first.');
      err.statusCode = 400;
      throw err;
    }

    const subscription = subResult.rows[0];
    const priceId = (await this.resolvePriceId(newPlanName)) || this.getPriceId(newPlanName);
    if (!priceId) {
      const err = new Error(`Stripe Price ID for plan "${newPlanName}" is not configured.`);
      err.statusCode = 400;
      throw err;
    }

    // 1. Get subscription from Stripe to find subscription item ID
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    if (!stripeSub || !stripeSub.items || stripeSub.items.data.length === 0) {
      throw new Error(`Stripe subscription ${subscription.stripe_subscription_id} has no valid line items`);
    }

    const itemId = stripeSub.items.data[0].id;
    const idempotencyKey = `sub_upg_${tenantId}_${newPlanName}_${Math.floor(Date.now() / 60000)}`;

    const updatedSub = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: itemId,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          tenant_id: tenantId,
          plan_name: newPlanName
        }
      },
      {
        idempotencyKey
      }
    );

    // 2. Update DB transactionally
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const planResult = await client.query('SELECT id FROM plans WHERE name = $1', [newPlanName]);
      if (planResult.rows.length > 0) {
        const planId = planResult.rows[0].id;

        await client.query(
          'UPDATE tenants SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [planId, tenantId]
        );

        await client.query(
          'UPDATE subscriptions SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [planId, subscription.id]
        );
      }

      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    return {
      success: true,
      message: `Subscription successfully updated to ${newPlanName}. Proration applied.`,
      stripe_subscription_id: updatedSub.id,
      status: updatedSub.status
    };
  }

  /**
   * Cancel an existing subscription in Stripe and database
   * @param {string} tenantId - Tenant UUID
   * @param {Object} [options] - Options (cancelAtPeriodEnd)
   * @returns {Object} - Result
   */
  async cancelSubscription(tenantId, options = {}) {
    const stripe = this.getStripeClient();
    if (!stripe) {
      const err = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.');
      err.statusCode = 503;
      throw err;
    }

    const subResult = await pool.query(
      "SELECT id, stripe_subscription_id, status FROM subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [tenantId]
    );

    if (subResult.rows.length === 0 || !subResult.rows[0].stripe_subscription_id) {
      const err = new Error('No active subscription found to cancel');
      err.statusCode = 404;
      throw err;
    }

    const subscription = subResult.rows[0];
    const cancelAtPeriodEnd = Boolean(options.cancelAtPeriodEnd);
    const idempotencyKey = `sub_cancel_${subscription.stripe_subscription_id}`;

    let canceledSub;
    if (cancelAtPeriodEnd) {
      canceledSub = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: true },
        { idempotencyKey }
      );
    } else {
      canceledSub = await stripe.subscriptions.cancel(
        subscription.stripe_subscription_id,
        {},
        { idempotencyKey }
      );
    }

    // Update database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const newStatus = cancelAtPeriodEnd ? 'active' : 'canceled';
      await client.query(
        'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, subscription.id]
      );

      // If canceled immediately, revert tenant to Free plan
      if (!cancelAtPeriodEnd) {
        const freePlanRes = await client.query("SELECT id FROM plans WHERE name = 'Free'");
        if (freePlanRes.rows.length > 0) {
          await client.query(
            'UPDATE tenants SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [freePlanRes.rows[0].id, tenantId]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      success: true,
      message: cancelAtPeriodEnd ? 'Subscription will cancel at end of billing cycle' : 'Subscription canceled immediately',
      status: canceledSub.status,
      cancel_at_period_end: canceledSub.cancel_at_period_end
    };
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
        process.env.STRIPE_WEBHOOK_SECRET.trim()
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return {
        status: 'error',
        message: 'Invalid signature',
        statusCode: 400
      };
    }

    if (!event || !event.type) {
      return {
        status: 'error',
        message: 'Invalid event format',
        statusCode: 400
      };
    }

    // 1. Webhook Lifecycle Management & Replay Safety
    // Lifecycle states: RECEIVED -> PROCESSING -> PROCESSED (on commit) / FAILED (on error)
    if (event.id) {
      const insertResult = await pool.query(
        `INSERT INTO webhook_events(stripe_event_id, event_type, status, attempts, created_at, updated_at)
         VALUES($1, $2, 'processing', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(stripe_event_id) DO NOTHING
         RETURNING id, status`,
        [event.id, event.type]
      );

      // Conflict detected - this event was received previously
      if (insertResult.rows.length === 0) {
        const existingResult = await pool.query(
          `SELECT id, status, attempts, updated_at 
           FROM webhook_events 
           WHERE stripe_event_id = $1`,
          [event.id]
        );

        if (existingResult.rows.length > 0) {
          const existing = existingResult.rows[0];

          // State: PROCESSED -> Business effects previously committed successfully
          if (existing.status === 'processed') {
            return {
              status: 'duplicate',
              message: 'Webhook event already processed'
            };
          }

          // State: PROCESSING -> Check if currently active or stale/timed-out
          if (existing.status === 'processing') {
            const timeSinceUpdate = Date.now() - new Date(existing.updated_at).getTime();
            const STALE_LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

            if (timeSinceUpdate < STALE_LOCK_TIMEOUT_MS) {
              return {
                status: 'error',
                statusCode: 409,
                message: 'Webhook event is currently being processed by another active worker'
              };
            }
            console.warn(`Webhook event ${event.id} was abandoned in 'processing' state. Re-claiming for retry...`);
          }

          // State: FAILED or STALE PROCESSING -> Safely retry the event
          await pool.query(
            `UPDATE webhook_events 
             SET status = 'processing',
                 attempts = COALESCE(attempts, 1) + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_event_id = $1`,
            [event.id]
          );
        }
      }
    }

    let result;
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          result = await this.handleCheckoutSessionCompleted(event.data.object, event.id);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          result = await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          result = await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.paid':
        case 'invoice.payment_succeeded':
          result = await this.handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          result = await this.handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          result = {
            status: 'ignored',
            message: `Event type ${event.type} not handled`
          };
      }

      // If handler returned an error status, transition to FAILED
      if (result && result.status === 'error') {
        if (event.id) {
          await pool.query(
            `UPDATE webhook_events 
             SET status = 'failed',
                 error_message = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_event_id = $2`,
            [result.message || 'Processing returned error', event.id]
          );
        }
        return result;
      }

      // SUCCESS: Mark PROCESSED only after database transactions commit
      if (event.id) {
        await pool.query(
          `UPDATE webhook_events 
           SET status = 'processed',
               processed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP,
               error_message = NULL
           WHERE stripe_event_id = $1`,
          [event.id]
        );
      }

      return result;

    } catch (error) {
      console.error(`Error processing webhook event ${event.id} (${event.type}):`, error.message);

      if (event.id) {
        try {
          await pool.query(
            `UPDATE webhook_events 
             SET status = 'failed',
                 error_message = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_event_id = $2`,
            [error.message || 'Unknown processing failure', event.id]
          );
        } catch (dbErr) {
          console.error('Failed to update webhook event status to failed:', dbErr.message);
        }
      }

      throw error;
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

      const tenantId = session.metadata?.tenant_id || session.client_reference_id;
      const planName = session.metadata?.plan_name || 'Pro';

      if (!tenantId) {
        await client.query('ROLLBACK');
        return {
          status: 'error',
          message: 'checkout.session.completed missing tenant_id metadata'
        };
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

      // Check for duplicate already active subscription
      if (session.subscription) {
        const existingSub = await client.query(
          'SELECT id FROM subscriptions WHERE tenant_id = $1 AND stripe_subscription_id = $2 AND status = $3',
          [tenantId, session.subscription, 'active']
        );
        if (existingSub.rows.length > 0) {
          await client.query('ROLLBACK');
          return {
            status: 'duplicate',
            message: 'Subscription already processed'
          };
        }
      }

      // Retrieve actual subscription details from Stripe
      let subscriptionData = null;
      if (session.subscription && stripe) {
        try {
          subscriptionData = await stripe.subscriptions.retrieve(session.subscription);
        } catch (subErr) {
          console.warn('Could not retrieve subscription details from Stripe:', subErr.message);
        }
      }

      if (session.subscription) {
        const periodStart = subscriptionData?.current_period_start || 
                            subscriptionData?.items?.data?.[0]?.current_period_start || 
                            Math.floor(Date.now() / 1000);
        const periodEnd = subscriptionData?.current_period_end || 
                          subscriptionData?.items?.data?.[0]?.current_period_end || 
                          (periodStart + (30 * 24 * 3600));
        const subStatus = subscriptionData ? subscriptionData.status : 'active';

        await client.query(
          `INSERT INTO subscriptions 
           (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
           VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
           ON CONFLICT (tenant_id, stripe_subscription_id) DO UPDATE
           SET status = EXCLUDED.status, 
               plan_id = EXCLUDED.plan_id, 
               current_period_start = EXCLUDED.current_period_start,
               current_period_end = EXCLUDED.current_period_end,
               updated_at = CURRENT_TIMESTAMP`,
          [
            tenantId,
            session.subscription,
            subStatus,
            planId,
            periodStart,
            periodEnd
          ]
        );
      }

      // Update tenant's plan and status to active
      await client.query(
        `UPDATE tenants 
         SET plan_id = $1, 
             status = 'active',
             stripe_customer_id = COALESCE(stripe_customer_id, $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [planId, session.customer || null, tenantId]
      );

      await client.query('COMMIT');

      return {
        status: 'success',
        message: 'Subscription created and tenant activated successfully'
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

      let tenantId = null;

      if (existingSubscription.rows.length === 0) {
        // Resolve tenant ID from subscription metadata or customer ID
        tenantId = subscription.metadata?.tenant_id;
        if (!tenantId && subscription.customer) {
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
            message: `Subscription ${subscription.id} cannot be mapped to any tenant`
          };
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planName = this.getPlanNameFromPriceId(priceId);
        const planRes = await client.query('SELECT id FROM plans WHERE name = $1', [planName]);
        const planId = planRes.rows[0]?.id;

        const periodStart = subscription.current_period_start || 
                            subscription.items?.data?.[0]?.current_period_start || 
                            Math.floor(Date.now() / 1000);
        const periodEnd = subscription.current_period_end || 
                          subscription.items?.data?.[0]?.current_period_end || 
                          (periodStart + (30 * 24 * 3600));

        await client.query(
          `INSERT INTO subscriptions 
           (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
           VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))`,
          [
            tenantId,
            subscription.id,
            subscription.status,
            planId,
            periodStart,
            periodEnd
          ]
        );
      } else {
        tenantId = existingSubscription.rows[0].tenant_id;

        const periodStart = subscription.current_period_start || 
                            subscription.items?.data?.[0]?.current_period_start || 
                            Math.floor(Date.now() / 1000);
        const periodEnd = subscription.current_period_end || 
                          subscription.items?.data?.[0]?.current_period_end || 
                          (periodStart + (30 * 24 * 3600));

        await client.query(
          `UPDATE subscriptions 
           SET status = $1, 
               current_period_start = to_timestamp($2),
               current_period_end = to_timestamp($3),
               updated_at = CURRENT_TIMESTAMP
           WHERE stripe_subscription_id = $4`,
          [
            subscription.status,
            periodStart,
            periodEnd,
            subscription.id
          ]
        );
      }

      if (tenantId) {
        let tenantStatus = 'active';
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          tenantStatus = 'inactive';
        } else if (subscription.status === 'past_due' || subscription.status === 'incomplete') {
          tenantStatus = 'past_due';
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
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
        "UPDATE subscriptions SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $1",
        [subscription.id]
      );

      // Move tenant back to Free plan
      const freePlanResult = await client.query(
        "SELECT id FROM plans WHERE name = 'Free'"
      );

      if (freePlanResult.rows.length > 0) {
        await client.query(
          'UPDATE tenants SET plan_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [freePlanResult.rows[0].id, 'active', tenantId]
        );
      }

      await client.query('COMMIT');

      return {
        status: 'success',
        message: 'Subscription canceled and tenant reverted to Free plan'
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
      const hostedUrl = invoice.hosted_invoice_url || null;
      const pdfUrl = invoice.invoice_pdf || null;

      // Update matching local invoice by stripe_invoice_id or metadata.local_invoice_id
      const localInvoiceId = invoice.metadata?.local_invoice_id;
      let updatedInvoice;

      if (localInvoiceId) {
        updatedInvoice = await client.query(
          `UPDATE invoices 
           SET status = 'paid', 
               stripe_invoice_id = COALESCE(stripe_invoice_id, $1),
               stripe_payment_intent_id = COALESCE($2, stripe_payment_intent_id),
               hosted_invoice_url = COALESCE($3, hosted_invoice_url),
               invoice_pdf = COALESCE($4, invoice_pdf),
               paid_at = COALESCE($5, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $6
           RETURNING id, tenant_id, billing_period`,
          [stripeInvoiceId, paymentIntentId, hostedUrl, pdfUrl, paidAt, localInvoiceId]
        );
      } else {
        updatedInvoice = await client.query(
          `UPDATE invoices 
           SET status = 'paid', 
               stripe_payment_intent_id = COALESCE($1, stripe_payment_intent_id),
               hosted_invoice_url = COALESCE($2, hosted_invoice_url),
               invoice_pdf = COALESCE($3, invoice_pdf),
               paid_at = COALESCE($4, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE stripe_invoice_id = $5
           RETURNING id, tenant_id, billing_period`,
          [paymentIntentId, hostedUrl, pdfUrl, paidAt, stripeInvoiceId]
        );
      }

      // If it's a subscription renewal invoice, update subscription current_period
      if (invoice.subscription && invoice.lines?.data?.length > 0) {
        const linePeriod = invoice.lines.data[0].period;
        if (linePeriod?.start && linePeriod?.end) {
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
        invoice_id: updatedInvoice?.rows[0]?.id || null
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
         WHERE stripe_invoice_id = $1 OR id = $2`,
        [invoice.id, invoice.metadata?.local_invoice_id || null]
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

      // Fetch subscriptions from Stripe
      const stripeSubs = await stripe.subscriptions.list({
        customer: tenant.stripe_customer_id,
        status: 'all',
        limit: 5
      });

      const activeStripeSub = stripeSubs.data.find(s => s.status === 'active' || s.status === 'trialing') || null;

      const dbSubRes = await client.query(
        "SELECT id, stripe_subscription_id, status, plan_id, current_period_end FROM subscriptions WHERE tenant_id = $1 AND status != 'canceled' ORDER BY created_at DESC LIMIT 1",
        [tenantId]
      );
      const dbSub = dbSubRes.rows.length > 0 ? dbSubRes.rows[0] : null;

      // Case A: Stripe has an active subscription
      if (activeStripeSub) {
        const priceId = activeStripeSub.items?.data?.[0]?.price?.id;
        const planName = this.getPlanNameFromPriceId(priceId);
        const planRes = await client.query('SELECT id FROM plans WHERE name = $1', [planName]);
        const planId = planRes.rows[0]?.id;

        const stripePeriodStart = activeStripeSub.current_period_start || 
                                  activeStripeSub.items?.data?.[0]?.current_period_start || 
                                  Math.floor(Date.now() / 1000);
        const stripePeriodEnd = activeStripeSub.current_period_end || 
                                activeStripeSub.items?.data?.[0]?.current_period_end || 
                                (stripePeriodStart + (30 * 24 * 3600));

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
              stripePeriodStart,
              stripePeriodEnd
            ]
          );
          changes.push('inserted_or_synced_subscription');
        } else {
          const dbEnd = new Date(dbSub.current_period_end).getTime() / 1000;
          if (Math.abs(dbEnd - stripePeriodEnd) > 60 || dbSub.status !== activeStripeSub.status) {
            await client.query(
              `UPDATE subscriptions 
               SET status = $1, current_period_end = to_timestamp($2), plan_id = $3, updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [activeStripeSub.status, stripePeriodEnd, planId, dbSub.id]
            );
            changes.push('updated_subscription_period_and_status');
          }
        }

        if (tenant.plan_id !== planId || tenant.status !== 'active') {
          await client.query(
            "UPDATE tenants SET plan_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [planId, tenant.id]
          );
          changes.push(`updated_tenant_plan_to_${planName}`);
        }

        await client.query('COMMIT');
      }

      // Case B: Stripe subscription canceled or missing, but DB shows active
      else if (!activeStripeSub && dbSub && dbSub.status === 'active') {
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

  /**
   * Retrieve recent webhook events and their lifecycle status
   * @param {Object} [filter] - Optional filter by status or limit
   * @returns {Promise<Array>}
   */
  async getWebhookEvents(filter = {}) {
    const limit = Math.min(parseInt(filter.limit, 10) || 50, 100);
    const params = [limit];
    let query = `
      SELECT id, stripe_event_id, event_type, status, attempts, error_message, processed_at, created_at, updated_at
      FROM webhook_events
    `;

    if (filter.status) {
      params.push(filter.status);
      query += ` WHERE status = $2`;
    }

    query += ` ORDER BY created_at DESC LIMIT $1`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new StripeService();
