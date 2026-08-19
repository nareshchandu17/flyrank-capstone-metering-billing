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
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        error: 'Internal server error'
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
      const payload = req.body;
      
      if (!signature) {
        return res.status(400).json({
          error: 'Missing stripe-signature header'
        });
      }
      
      const result = await stripeService.handleWebhook(signature, payload);
      
      if (result.status === 'error') {
        return res.status(result.statusCode).json({
          error: result.message
        });
      }
      
      res.status(200).json({
        status: result.status,
        message: result.message
      });
      
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new StripeController();
