const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');

class StripeService {
  /**
   * Create a Stripe checkout session for subscription
   * @param {string} tenantId - Tenant UUID
   * @param {string} planName - Plan name ('Free' or 'Pro')
   * @returns {Object} - Checkout session URL
   */
  async createCheckoutSession(tenantId, planName) {
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
      
      // Define Stripe price IDs (these would be created in Stripe dashboard)
      // For test mode, we'll use test price IDs
      const priceIds = {
        'Free': 'price_free_plan_id',
        'Pro': 'price_pro_plan_id'
      };
      
      const priceId = priceIds[planName];
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
    try {
      // 1. Get tenant and their current subscription
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
      
      // 2. Define Stripe price IDs
      const priceIds = {
        'Free': 'price_free_plan_id',
        'Pro': 'price_pro_plan_id'
      };
      
      const priceId = priceIds[newPlanName];
      if (!priceId) {
        throw new Error('Invalid plan name');
      }
      
      // 3. Get subscription from Stripe to find the subscription item ID
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      
      // 4. Update the subscription in Stripe (Stripe handles proration by default)
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
      
      // 5. Update our DB (Tenant plan changes immediately, webhook will handle future updates)
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
   * Handle Stripe webhook events
   * @param {string} signature - Stripe signature header
   * @param {string} payload - Raw webhook payload
   * @returns {Object} - Event processing result
   */
  async handleWebhook(signature, payload) {
    let event;
    
    try {
      // Verify webhook signature
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
    
    switch (event.type) {
      case 'checkout.session.completed':
        return await this.handleCheckoutSessionCompleted(event.data.object);
      
      case 'customer.subscription.updated':
        return await this.handleSubscriptionUpdated(event.data.object);
      
      case 'customer.subscription.deleted':
        return await this.handleSubscriptionDeleted(event.data.object);
      
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
   * @returns {Object} - Processing result
   */
  async handleCheckoutSessionCompleted(session) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const tenantId = session.metadata.tenant_id;
      const planName = session.metadata.plan_name;
      
      // Check for duplicate event processing
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
      
      // Get plan ID from plan name
      const planResult = await client.query(
        'SELECT id FROM plans WHERE name = $1',
        [planName]
      );
      
      if (planResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Plan not found');
      }
      
      const planId = planResult.rows[0].id;
      
      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Create subscription record
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
      
      // Update tenant's plan
      await client.query(
        'UPDATE tenants SET plan_id = $1 WHERE id = $2',
        [planId, tenantId]
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
        await client.query('ROLLBACK');
        return {
          status: 'not_found',
          message: 'Subscription not found in database'
        };
      }
      
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
      
      // Update tenant status based on subscription
      const tenantId = existingSubscription.rows[0].tenant_id;
      const tenantStatus = subscription.status === 'active' ? 'active' : 'inactive';
      
      await client.query(
        'UPDATE tenants SET status = $1 WHERE id = $2',
        [tenantStatus, tenantId]
      );
      
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
      
      // Get subscription details
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
      
      // Update subscription status
      await client.query(
        'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
        ['canceled', subscription.id]
      );
      
      // Move tenant to Free plan
      const freePlanResult = await client.query(
        'SELECT id FROM plans WHERE name = $1',
        ['Free']
      );
      
      if (freePlanResult.rows.length > 0) {
        await client.query(
          'UPDATE tenants SET plan_id = $1 WHERE id = $2',
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
}

module.exports = new StripeService();
