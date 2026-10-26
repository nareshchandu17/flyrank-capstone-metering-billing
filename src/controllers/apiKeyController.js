const apiKeyService = require('../services/apiKeyService');

class ApiKeyController {
  /**
   * Helper to resolve tenant ID and enforce scoping
   */
  resolveTenantId(req) {
    if (req.isAdmin) {
      return req.params.tenant_id || req.body.tenant_id || req.tenantId;
    }
    // For non-admin, target must match their own tenantId
    const targetTenantId = req.params.tenant_id || req.tenantId;
    if (req.tenantId && targetTenantId && req.tenantId !== targetTenantId) {
      const err = new Error('Access denied: You can only manage API keys for your own tenant');
      err.statusCode = 403;
      throw err;
    }
    return req.tenantId || targetTenantId;
  }

  /**
   * Create an API key
   * POST /api/tenants/:tenant_id/api-keys or POST /api/api-keys
   */
  async createKey(req, res) {
    try {
      const tenantId = this.resolveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { name = 'Default Key' } = req.body;
      const keyRecord = await apiKeyService.createApiKey(tenantId, name);

      res.status(201).json({
        message: 'API key created successfully. Store this key securely as it will not be shown again.',
        data: keyRecord,
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * List API keys
   * GET /api/tenants/:tenant_id/api-keys or GET /api/api-keys
   */
  async listKeys(req, res) {
    try {
      const tenantId = this.resolveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const keys = await apiKeyService.listApiKeys(tenantId);
      res.status(200).json({ data: keys });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * Rotate an API key
   * POST /api/tenants/:tenant_id/api-keys/:key_id/rotate or POST /api/api-keys/:key_id/rotate
   */
  async rotateKey(req, res) {
    try {
      const tenantId = this.resolveTenantId(req);
      const keyId = req.params.key_id || req.params.id;

      if (!tenantId || !keyId) {
        return res.status(400).json({ error: 'Tenant ID and Key ID are required' });
      }

      const rotationResult = await apiKeyService.rotateApiKey(tenantId, keyId);
      res.status(200).json({
        message: 'API key rotated successfully. The old key is revoked and the new key is active.',
        data: rotationResult,
      });
    } catch (error) {
      console.error('Error rotating API key:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * Revoke an API key
   * DELETE /api/tenants/:tenant_id/api-keys/:key_id or POST /api/tenants/:tenant_id/api-keys/:key_id/revoke
   */
  async revokeKey(req, res) {
    try {
      const tenantId = this.resolveTenantId(req);
      const keyId = req.params.key_id || req.params.id;

      if (!tenantId || !keyId) {
        return res.status(400).json({ error: 'Tenant ID and Key ID are required' });
      }

      const revokedKey = await apiKeyService.revokeApiKey(tenantId, keyId);
      res.status(200).json({
        message: 'API key revoked successfully. It can no longer be used for authentication.',
        data: revokedKey,
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }
}

const controller = new ApiKeyController();
module.exports = {
  createKey: controller.createKey.bind(controller),
  listKeys: controller.listKeys.bind(controller),
  rotateKey: controller.rotateKey.bind(controller),
  revokeKey: controller.revokeKey.bind(controller),
};
