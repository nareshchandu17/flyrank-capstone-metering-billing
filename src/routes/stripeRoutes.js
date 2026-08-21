const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// Stripe endpoints
router.post('/checkout', stripeController.createCheckoutSession);
router.post('/upgrade', stripeController.upgradeSubscription);
router.post('/webhooks', express.raw({type: 'application/json'}), stripeController.handleWebhook);

module.exports = router;
