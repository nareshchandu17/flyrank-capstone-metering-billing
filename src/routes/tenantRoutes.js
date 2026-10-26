const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const apiKeyController = require('../controllers/apiKeyController');
const { requireAdminAuth, requireTenantOrAdmin } = require('../middleware/auth');

// Middleware to enforce scoping when accessing tenant-specific resource by :id
const enforceTenantScopeById = (req, res, next) => {
  if (req.isAdmin) return next();
  const targetId = req.params.id || req.params.tenant_id;
  if (req.tenantId && targetId && targetId !== req.tenantId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: You can only access data for your own tenant'
    });
  }
  next();
};

// CRUD operations for tenants (Admin only)
router.get('/', requireAdminAuth, tenantController.getAllTenants);
router.post('/', requireAdminAuth, tenantController.createTenant);
router.put('/:id', requireAdminAuth, tenantController.updateTenant);
router.delete('/:id', requireAdminAuth, tenantController.deleteTenant);

// Tenant-specific queries (Admin or Scoped Tenant)
router.get('/:id', requireTenantOrAdmin, enforceTenantScopeById, tenantController.getTenantById);
router.get('/:id/usage', requireTenantOrAdmin, enforceTenantScopeById, tenantController.getTenantUsage);
router.get('/:id/subscription', requireTenantOrAdmin, enforceTenantScopeById, tenantController.getTenantSubscription);

// API Key management per tenant (Admin or Scoped Tenant)
router.post('/:tenant_id/api-keys', requireTenantOrAdmin, enforceTenantScopeById, apiKeyController.createKey);
router.get('/:tenant_id/api-keys', requireTenantOrAdmin, enforceTenantScopeById, apiKeyController.listKeys);
router.post('/:tenant_id/api-keys/:key_id/rotate', requireTenantOrAdmin, enforceTenantScopeById, apiKeyController.rotateKey);
router.post('/:tenant_id/api-keys/:key_id/revoke', requireTenantOrAdmin, enforceTenantScopeById, apiKeyController.revokeKey);
router.delete('/:tenant_id/api-keys/:key_id', requireTenantOrAdmin, enforceTenantScopeById, apiKeyController.revokeKey);

module.exports = router;