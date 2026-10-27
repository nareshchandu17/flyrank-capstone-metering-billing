const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const { requireTenantOrAdmin, requireAdminAuth } = require('../middleware/auth');

// Usage analytics endpoints (Protected by Tenant or Admin Auth)
router.get('/stats', requireTenantOrAdmin, usageController.getUsageStats);
router.get('/events/:tenant_id', requireTenantOrAdmin, usageController.getUsageEvents);
router.get('/endpoints', requireTenantOrAdmin, usageController.getTopEndpoints);
router.get('/resources', requireAdminAuth, usageController.getResourceUsage);

module.exports = router;
