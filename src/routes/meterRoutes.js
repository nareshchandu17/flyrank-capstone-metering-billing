const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const { requireApiKey } = require('../middleware/auth');

// Health check
router.get('/health', meterController.healthCheck);

// Core metering endpoints (Protected by API Key)
router.post('/usage', requireApiKey, meterController.recordUsage);
router.post('/generate', requireApiKey, meterController.generate);
router.get('/usage/:tenant_id', meterController.getUsageSummary);
router.get('/invoices/:tenant_id', meterController.getInvoices);

module.exports = router;
