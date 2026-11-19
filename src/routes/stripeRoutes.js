const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { 
  requireAuth0User, 
  requirePlatformAdmin, 
  requirePermission 
} = require('../middleware/auth');
const { sensitiveOpLimiter } = require('../middleware/rateLimiter');
const { PERMISSIONS } = require('../config/permissions');

// 1. PUBLIC Stripe Webhook Receiver (protected only by cryptographic HMAC signature)
router.post('/webhooks', stripeController.handleWebhook);

// 2. Webhook Event Inspection (Platform Admin Only)
router.get('/webhooks/events', requireAuth0User, requirePlatformAdmin, stripeController.getWebhookEvents);

// 3. Billing & Checkout Operations (Auth0 JWT + BILLING_MANAGE permission)
router.post('/checkout', sensitiveOpLimiter, requireAuth0User, requirePermission(PERMISSIONS.BILLING_MANAGE), stripeController.createCheckoutSession);
router.post('/upgrade', sensitiveOpLimiter, requireAuth0User, requirePermission(PERMISSIONS.BILLING_MANAGE), stripeController.upgradeSubscription);
router.post('/cancel', sensitiveOpLimiter, requireAuth0User, requirePermission(PERMISSIONS.BILLING_MANAGE), stripeController.cancelSubscription);

// 4. Recoverable Invoice Synchronization
router.post('/invoices/:invoice_id/sync', requireAuth0User, requirePermission(PERMISSIONS.BILLING_MANAGE), stripeController.syncInvoiceToStripe);

// 5. Reconciliation
// Global reconciliation: Platform Admin Only
router.post('/reconcile', requireAuth0User, requirePlatformAdmin, stripeController.reconcileSubscriptions);
// Tenant-specific reconciliation: BILLING_MANAGE permission
router.post('/reconcile/:tenant_id', requireAuth0User, requirePermission(PERMISSIONS.BILLING_MANAGE), stripeController.reconcileSubscriptions);

module.exports = router;
