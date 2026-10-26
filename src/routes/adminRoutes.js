const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/auth');

// Protect all admin endpoints with requireAdminAuth
router.use(requireAdminAuth);

// Tenant Management
router.get('/tenants', adminController.getTenants);
router.post('/tenants', adminController.createTenant);
router.put('/tenants/:id', adminController.updateTenant);
router.delete('/tenants/:id', adminController.deleteTenant);

// Dashboard Metrics
router.get('/metrics', adminController.getMetrics);
router.get('/usage/history', adminController.getUsageHistory);
router.get('/usage/realtime', adminController.getRealTimeUsage);

module.exports = router;
