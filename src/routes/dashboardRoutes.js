const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireTenantOrAdmin } = require('../middleware/auth');

// Dashboard endpoints (Protected by Tenant or Admin Auth)
router.get('/stats', requireTenantOrAdmin, dashboardController.getDashboardStats);

module.exports = router;