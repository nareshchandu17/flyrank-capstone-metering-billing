const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { requireAuth0User, requirePlatformAdmin } = require('../middleware/auth');

// All platform admin endpoints require verified Auth0 user + database Platform Admin role
router.use(requireAuth0User);
router.use(requirePlatformAdmin);

// Tenant Management (Platform Admin Only)
router.get('/tenants', adminController.getTenants);
router.post('/tenants', adminController.createTenant);
router.put('/tenants/:id', adminController.updateTenant);
router.delete('/tenants/:id', adminController.deleteTenant);

// Platform-Wide Dashboard Metrics (Platform Admin Only)
router.get('/metrics', adminController.getMetrics);
router.get('/usage/history', adminController.getUsageHistory);
router.get('/usage/realtime', adminController.getRealTimeUsage);

// Dynamic Plans & Quotas Management (Platform Admin Only)
router.get('/plans', adminController.getPlans);
router.put('/plans/:id', adminController.updatePlan);

// Dynamic Pricing Rules Management (Platform Admin Only)
router.get('/pricing-rules', adminController.getPricingRules);
router.put('/pricing-rules/:id', adminController.updatePricingRule);

// Global Audit Logs (Platform Admin Only)
router.get('/audit-logs', authController.getAuditLogs);

module.exports = router;
