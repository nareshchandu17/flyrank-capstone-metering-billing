const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { requireTenantOrAdmin } = require('../middleware/auth');

// History endpoints (Protected by Tenant or Admin Auth)
router.use(requireTenantOrAdmin);

router.get('/transactions', historyController.getTransactions);
router.get('/invoices', historyController.getInvoices);
router.get('/summary', historyController.getTransactionSummary);

module.exports = router;
