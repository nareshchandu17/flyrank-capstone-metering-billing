const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { requireAuth0User, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');

// History & Invoicing endpoints require Auth0 authentication and BILLING_VIEW or USAGE_VIEW permission
router.use(requireAuth0User);

router.get('/transactions', requirePermission(PERMISSIONS.USAGE_VIEW), historyController.getTransactions);
router.get('/invoices', requirePermission(PERMISSIONS.INVOICES_VIEW), historyController.getInvoices);
router.get('/summary', requirePermission(PERMISSIONS.BILLING_VIEW), historyController.getTransactionSummary);

module.exports = router;
