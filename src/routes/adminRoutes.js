const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

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
