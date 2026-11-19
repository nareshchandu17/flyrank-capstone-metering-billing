const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const apiKeyController = require('../controllers/apiKeyController');
const authController = require('../controllers/authController');
const { 
  requireAuth0User, 
  requirePlatformAdmin, 
  requirePermission 
} = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');

// All human tenant management routes require Auth0 authentication
router.use(requireAuth0User);

// 1. Tenant Creation & Listing across user's tenants (or all tenants for Platform Admin)
router.get('/', tenantController.getAllTenants);
router.post('/', tenantController.createTenant);

// 2. Tenant lifecycle operations
router.put('/:id', requirePermission(PERMISSIONS.TENANT_UPDATE), tenantController.updateTenant);
router.delete('/:id', requirePlatformAdmin, tenantController.deleteTenant);

// 3. Tenant-scoped details, usage, and subscription
router.get('/:id', requirePermission(PERMISSIONS.TENANT_VIEW), tenantController.getTenantById);
router.get('/:id/usage', requirePermission(PERMISSIONS.USAGE_VIEW), tenantController.getTenantUsage);
router.get('/:id/subscription', requirePermission(PERMISSIONS.BILLING_VIEW), tenantController.getTenantSubscription);

// 4. API Key management per tenant (Tenant Owner, Developer, Platform Admin)
router.post('/:tenant_id/api-keys', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.createKey);
router.get('/:tenant_id/api-keys', requirePermission(PERMISSIONS.API_KEYS_VIEW), apiKeyController.listKeys);
router.post('/:tenant_id/api-keys/:key_id/rotate', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.rotateKey);
router.post('/:tenant_id/api-keys/:key_id/revoke', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.revokeKey);
router.delete('/:tenant_id/api-keys/:key_id', requirePermission(PERMISSIONS.API_KEYS_MANAGE), apiKeyController.revokeKey);

// 5. Tenant Membership & Invitation Management (Tenant Owner, Platform Admin)
router.get('/:tenant_id/members', requirePermission(PERMISSIONS.MEMBERS_VIEW), authController.listMembers);
router.put('/:tenant_id/members/:member_id', requirePermission(PERMISSIONS.MEMBERS_MANAGE), authController.updateMember);
router.delete('/:tenant_id/members/:member_id', requirePermission(PERMISSIONS.MEMBERS_MANAGE), authController.removeMember);

router.get('/:tenant_id/invitations', requirePermission(PERMISSIONS.MEMBERS_VIEW), authController.listInvitations);
router.post('/:tenant_id/invitations', requirePermission(PERMISSIONS.MEMBERS_MANAGE), authController.createInvitation);
router.delete('/:tenant_id/invitations/:invitation_id', requirePermission(PERMISSIONS.MEMBERS_MANAGE), authController.revokeInvitation);

// 6. Tenant-specific audit logs
router.get('/:tenant_id/audit-logs', requirePermission(PERMISSIONS.TENANT_VIEW), authController.getAuditLogs);

module.exports = router;
