const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

// History endpoints
router.get('/transactions', historyController.getTransactions);
router.get('/invoices', historyController.getInvoices);
router.get('/summary', historyController.getTransactionSummary);

module.exports = router;
