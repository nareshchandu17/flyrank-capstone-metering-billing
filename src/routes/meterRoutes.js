const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const { requireApiKey, requireTenantOrAdmin } = require('../middleware/auth');

// Health check
router.get('/health', meterController.healthCheck);

// Core metering endpoints (Protected by API Key)
router.post('/usage', requireApiKey, meterController.recordUsage);
router.post('/generate', requireApiKey, meterController.generate);

// Tenant-scoped usage summaries and invoices (Protected by Tenant or Admin Auth)
router.get('/usage', requireTenantOrAdmin, meterController.getUsageSummary);
router.get('/usage/:tenant_id', requireTenantOrAdmin, meterController.getUsageSummary);
router.get('/invoices', requireTenantOrAdmin, meterController.getInvoices);
router.get('/invoices/:tenant_id', requireTenantOrAdmin, meterController.getInvoices);
router.get('/invoices/detail/:id', requireTenantOrAdmin, meterController.getInvoiceDetail);
router.post('/invoices/generate', requireTenantOrAdmin, meterController.generateInvoice);

module.exports = router;
