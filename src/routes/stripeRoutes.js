const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// Stripe endpoints
router.post('/checkout', stripeController.createCheckoutSession);
router.post('/webhooks', stripeController.handleWebhook);

module.exports = router;
