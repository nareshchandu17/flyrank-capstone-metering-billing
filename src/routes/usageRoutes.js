const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const { requireAuth0User, requirePlatformAdmin, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');

// All usage dashboard endpoints require Auth0 authentication
router.use(requireAuth0User);

router.get('/stats', requirePermission(PERMISSIONS.USAGE_VIEW), usageController.getUsageStats);
router.get('/events/:tenant_id', requirePermission(PERMISSIONS.USAGE_VIEW), usageController.getUsageEvents);
router.get('/endpoints', requirePermission(PERMISSIONS.USAGE_VIEW), usageController.getTopEndpoints);
router.get('/resources', requirePlatformAdmin, usageController.getResourceUsage);

module.exports = router;
