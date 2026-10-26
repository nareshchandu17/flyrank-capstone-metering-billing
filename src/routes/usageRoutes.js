const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');

// Usage analytics endpoints
router.get('/stats', usageController.getUsageStats);
router.get('/events/:tenant_id', usageController.getUsageEvents);
router.get('/endpoints', usageController.getTopEndpoints);
router.get('/resources', usageController.getResourceUsage);

module.exports = router;
