const stripeService = require('../services/stripeService');

class StripeController {
  /**
   * Create checkout session for subscription
   * POST /api/stripe/checkout
   */
  async createCheckoutSession(req, res) {
    try {
      const { tenant_id, plan_name } = req.body;
      
      // Validate required fields
      if (!tenant_id || !plan_name) {
        return res.status(400).json({
          error: 'Missing required fields: tenant_id, plan_name'
        });
      }
      
      // Validate plan name
      if (!['Free', 'Pro'].includes(plan_name)) {
        return res.status(400).json({
          error: 'Invalid plan_name. Must be "Free" or "Pro"'
        });
      }
      
      const session = await stripeService.createCheckoutSession(tenant_id, plan_name);
      
      res.status(200).json({
        checkout_url: session.url,
        session_id: session.sessionId
      });
      
    } catch (error) {
      console.error('Error creating checkout session:', error.message);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Upgrade subscription
   * POST /api/stripe/upgrade
   */
  async upgradeSubscription(req, res) {
    try {
      const { tenant_id, new_plan_name } = req.body;
      
      if (!tenant_id || !new_plan_name) {
        return res.status(400).json({
          error: 'Missing required fields: tenant_id, new_plan_name'
        });
      }
      
      if (!['Free', 'Pro'].includes(new_plan_name)) {
        return res.status(400).json({
          error: 'Invalid plan_name. Must be "Free" or "Pro"'
        });
      }
      
      const result = await stripeService.upgradeSubscription(tenant_id, new_plan_name);
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Error upgrading subscription:', error.message);
      if (error.message.includes('No active subscription')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }
  
  /**
   * Handle Stripe webhooks
   * POST /api/stripe/webhooks
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      // Prefer raw Buffer body for HMAC verification
      const payload = Buffer.isBuffer(req.body)
        ? req.body
        : (req.rawBody || req.body);
      
      if (!signature) {
        return res.status(400).json({
          error: 'Missing stripe-signature header'
        });
      }
      
      const result = await stripeService.handleWebhook(signature, payload);
      
      if (result.status === 'error') {
        return res.status(result.statusCode || 400).json({
          error: result.message
        });
      }
      
      res.status(200).json({
        status: result.status,
        message: result.message
      });
      
    } catch (error) {
      console.error('Error handling webhook:', error.message);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Reconcile subscriptions between Stripe and local database
   * POST /api/stripe/reconcile or POST /api/stripe/reconcile/:tenant_id
   */
  async reconcileSubscriptions(req, res) {
    try {
      const targetTenantId = req.params.tenant_id || (req.body && req.body.tenant_id);

      if (targetTenantId) {
        if (!req.isAdmin && req.tenantId && req.tenantId !== targetTenantId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied: You can only reconcile your own tenant'
          });
        }
        const result = await stripeService.reconcileTenantSubscription(targetTenantId);
        return res.status(200).json(result);
      }

      // Reconcile all tenants (admin only)
      if (!req.isAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin privileges required to reconcile all subscriptions'
        });
      }

      const summary = await stripeService.reconcileAllSubscriptions();
      res.status(200).json(summary);
    } catch (error) {
      console.error('Error during subscription reconciliation:', error.message);
      res.status(500).json({
        error: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new StripeController();
