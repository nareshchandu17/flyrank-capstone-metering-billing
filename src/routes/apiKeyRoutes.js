const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { requireAuth0User, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');

// API Key self-service management endpoints require Auth0 authentication
router.use(requireAuth0User);

router.post('/', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.createKey);
router.get('/', requirePermission(PERMISSIONS.API_KEYS_VIEW), apiKeyController.listKeys);
router.post('/:key_id/rotate', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.rotateKey);
router.post('/:key_id/revoke', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.revokeKey);
router.delete('/:key_id', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.revokeKey);

module.exports = router;
