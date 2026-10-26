const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { requireTenantOrAdmin } = require('../middleware/auth');

// All API key endpoints require authentication (tenant API key or admin credentials)
router.use(requireTenantOrAdmin);

// Tenant-scoped self-service endpoints
router.post('/', apiKeyController.createKey);
router.get('/', apiKeyController.listKeys);
router.post('/:key_id/rotate', apiKeyController.rotateKey);
router.post('/:key_id/revoke', apiKeyController.revokeKey);
router.delete('/:key_id', apiKeyController.revokeKey);

module.exports = router;
