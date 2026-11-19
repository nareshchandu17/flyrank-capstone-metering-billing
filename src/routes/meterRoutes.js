const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const { 
  requireApiKey, 
  requireAuth0User, 
  requirePermission 
} = require('../middleware/auth');
const { ingestionLimiter } = require('../middleware/rateLimiter');
const { PERMISSIONS } = require('../config/permissions');

// 1. Public Health Check
router.get('/health', meterController.healthCheck);

// 2. Machine-to-Machine Ingestion & AI Generation (Strictly API-Key Authenticated)
router.post('/usage', ingestionLimiter, requireApiKey, meterController.recordUsage);
router.post('/generate', ingestionLimiter, requireApiKey, meterController.generate);

// 3. Human UI / Dashboard Invoicing & Summaries (Auth0 JWT + RBAC)
router.get('/usage', requireAuth0User, requirePermission(PERMISSIONS.USAGE_VIEW), meterController.getUsageSummary);
router.get('/usage/:tenant_id', requireAuth0User, requirePermission(PERMISSIONS.USAGE_VIEW), meterController.getUsageSummary);

router.get('/invoices', requireAuth0User, requirePermission(PERMISSIONS.INVOICES_VIEW), meterController.getInvoices);
router.get('/invoices/:tenant_id', requireAuth0User, requirePermission(PERMISSIONS.INVOICES_VIEW), meterController.getInvoices);
router.get('/invoices/detail/:id', requireAuth0User, requirePermission(PERMISSIONS.INVOICES_VIEW), meterController.getInvoiceDetail);
router.post('/invoices/generate', requireAuth0User, requirePermission(PERMISSIONS.INVOICES_GENERATE), meterController.generateInvoice);

module.exports = router;
