const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');

// Health check
router.get('/health', meterController.healthCheck);

// Usage endpoints
router.post('/usage', meterController.recordUsage);
router.post('/generate', meterController.generate);
router.get('/usage/:tenant_id', meterController.getUsageSummary);

module.exports = router;
