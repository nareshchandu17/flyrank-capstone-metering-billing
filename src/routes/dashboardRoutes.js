const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth0User, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');

// Dashboard endpoints require Auth0 authentication and USAGE_VIEW permission
router.use(requireAuth0User);

router.get('/stats', requirePermission(PERMISSIONS.USAGE_VIEW), dashboardController.getDashboardStats);

module.exports = router;
