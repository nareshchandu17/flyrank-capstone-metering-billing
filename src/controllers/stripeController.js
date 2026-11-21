const stripeService = require('../services/stripeService');
const invoiceService = require('../services/invoiceService');

class StripeController {
  /**
   * Create checkout session for subscription
   * POST /api/stripe/checkout
   */
  async createCheckoutSession(req, res) {
    try {
      const targetTenantId = req.isPlatformAdmin ? (req.body.tenant_id || req.tenantId) : req.tenantId;
      const { plan_name } = req.body;

      // Prevent cross-tenant body tampering
      if (!req.isPlatformAdmin && req.body.tenant_id && req.body.tenant_id !== req.tenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only manage Stripe billing for your own tenant'
        });
      }

      // Validate required fields
      if (!targetTenantId || !plan_name) {
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

      const session = await stripeService.createCheckoutSession(targetTenantId, plan_name);

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
      const targetTenantId = req.isPlatformAdmin ? (req.body.tenant_id || req.tenantId) : req.tenantId;
      const newPlanName = req.body.new_plan_name || req.body.plan_name;

      // Prevent cross-tenant body tampering
      if (!req.isPlatformAdmin && req.body.tenant_id && req.body.tenant_id !== req.tenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only manage Stripe billing for your own tenant'
        });
      }

      if (!targetTenantId || !newPlanName) {
        return res.status(400).json({
          error: 'Missing required fields: tenant_id, new_plan_name'
        });
      }

      if (!['Free', 'Pro'].includes(newPlanName)) {
        return res.status(400).json({
          error: 'Invalid plan_name. Must be "Free" or "Pro"'
        });
      }

      const result = await stripeService.upgradeSubscription(targetTenantId, newPlanName);
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
   * Cancel subscription
   * POST /api/stripe/cancel
   */
  async cancelSubscription(req, res) {
    try {
      const targetTenantId = req.isPlatformAdmin ? (req.body.tenant_id || req.tenantId) : req.tenantId;
      const { cancel_at_period_end = false } = req.body;

      // Prevent cross-tenant body tampering
      if (!req.isPlatformAdmin && req.body.tenant_id && req.body.tenant_id !== req.tenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only cancel subscriptions for your own tenant'
        });
      }

      if (!targetTenantId) {
        return res.status(400).json({
          error: 'Missing required field: tenant_id'
        });
      }

      const result = await stripeService.cancelSubscription(targetTenantId, { cancelAtPeriodEnd: cancel_at_period_end });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error canceling subscription:', error.message);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Sync a local invoice with Stripe (recoverable synchronization)
   * POST /api/stripe/invoices/:invoice_id/sync
   */
  async syncInvoiceToStripe(req, res) {
    try {
      const invoiceId = req.params.invoice_id || req.params.id;
      if (!invoiceId) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      const invoice = await invoiceService.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Enforce tenant scoping
      if (!req.isPlatformAdmin && req.tenantId && req.tenantId !== invoice.tenant_id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only sync invoices for your own tenant'
        });
      }

      const syncedInvoice = await invoiceService.syncInvoiceToStripe(invoiceId);
      res.status(200).json({
        success: true,
        message: 'Invoice synchronized with Stripe successfully',
        invoice: syncedInvoice
      });
    } catch (error) {
      console.error('Error syncing invoice with Stripe:', error.message);
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
        if (!req.isPlatformAdmin && req.tenantId && req.tenantId !== targetTenantId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied: You can only reconcile your own tenant'
          });
        }
        const result = await stripeService.reconcileTenantSubscription(targetTenantId);
        return res.status(200).json(result);
      }

      // Reconcile all tenants (Platform Admin only)
      if (!req.isPlatformAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Platform Admin privileges required to reconcile all subscriptions'
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

  /**
   * Get webhook events lifecycle log (Platform Admin only)
   * GET /api/stripe/webhooks/events
   */
  async getWebhookEvents(req, res) {
    try {
      const { status, limit } = req.query;
      const events = await stripeService.getWebhookEvents({ status, limit });
      res.status(200).json(events);
    } catch (error) {
      console.error('Error fetching webhook events:', error.message);
      res.status(500).json({ error: 'Failed to fetch webhook events' });
    }
  }

  /**
   * Create customer billing portal session
   * POST /api/stripe/portal
   */
  async createCustomerPortalSession(req, res) {
    try {
      const targetTenantId = req.isPlatformAdmin ? (req.body.tenant_id || req.tenantId) : req.tenantId;
      const { return_url } = req.body;

      if (!targetTenantId) {
        return res.status(400).json({ error: 'Tenant context is required' });
      }

      const session = await stripeService.createCustomerPortalSession(targetTenantId, return_url);
      res.status(200).json(session);
    } catch (error) {
      console.error('Error creating Stripe portal session:', error.message);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new StripeController();
