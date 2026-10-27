const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

const { requireAdminAuth, requireTenantOrAdmin } = require('../middleware/auth');

// Stripe endpoints
router.post('/checkout', stripeController.createCheckoutSession);
router.post('/upgrade', stripeController.upgradeSubscription);
router.post('/webhooks', stripeController.handleWebhook);
router.post('/reconcile', requireAdminAuth, stripeController.reconcileSubscriptions);
router.post('/reconcile/:tenant_id', requireTenantOrAdmin, stripeController.reconcileSubscriptions);

module.exports = router;
