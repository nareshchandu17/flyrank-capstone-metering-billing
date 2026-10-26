const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Extract token/key from Authorization Bearer header, X-API-Key header, or X-Admin-Key header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].trim();
  }
  if (req.headers['x-api-key']) {
    return req.headers['x-api-key'].trim();
  }
  if (req.headers['x-admin-key']) {
    return req.headers['x-admin-key'].trim();
  }
  return null;
}

/**
 * Middleware to authenticate API requests using Bearer token or X-API-Key
 */
const requireApiKey = async (req, res, next) => {
  try {
    const apiKey = extractToken(req);
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected format: Bearer <API_KEY>'
      });
    }

    // Hash the provided key to compare with the database
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const result = await pool.query(
      `SELECT k.id, k.tenant_id, k.status as key_status, k.revoked_at, t.status as tenant_status 
       FROM api_keys k
       JOIN tenants t ON k.tenant_id = t.id
       WHERE k.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    const keyRecord = result.rows[0];

    // Check if API key has been revoked
    if (keyRecord.key_status === 'revoked' || keyRecord.revoked_at !== null) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has been revoked'
      });
    }

    // Check if tenant account is active
    if (keyRecord.tenant_status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Tenant account is inactive or suspended'
      });
    }

    // Attach tenantId and apiKeyId to the request object
    req.tenantId = keyRecord.tenant_id;
    req.apiKeyId = keyRecord.id;
    
    // Update last_used_at async (don't block the request)
    pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [keyRecord.id])
      .catch(err => console.error('Failed to update API key last_used_at:', err));

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

/**
 * Middleware to authenticate administrative operations
 */
const requireAdminAuth = (req, res, next) => {
  const adminKey = extractToken(req);
  const configuredAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';

  if (!adminKey || adminKey !== configuredAdminKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid administrative credentials'
    });
  }

  req.isAdmin = true;
  req.user = { role: 'admin' };
  next();
};

/**
 * Middleware allowing either admin credentials or a valid tenant API key.
 * Also enforces secure tenant scoping if a tenant_id param is present.
 */
const requireTenantOrAdmin = async (req, res, next) => {
  const token = extractToken(req);
  const configuredAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Provide an API key or administrative credentials.'
    });
  }

  // 1. Check if it's admin credentials
  if (token === configuredAdminKey) {
    req.isAdmin = true;
    req.user = { role: 'admin' };
    return next();
  }

  // 2. Otherwise check if it's a valid tenant API key
  try {
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT k.id, k.tenant_id, k.status as key_status, k.revoked_at, t.status as tenant_status 
       FROM api_keys k
       JOIN tenants t ON k.tenant_id = t.id
       WHERE k.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key or credentials'
      });
    }

    const keyRecord = result.rows[0];

    if (keyRecord.key_status === 'revoked' || keyRecord.revoked_at !== null) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has been revoked'
      });
    }

    if (keyRecord.tenant_status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Tenant account is inactive or suspended'
      });
    }

    req.tenantId = keyRecord.tenant_id;
    req.apiKeyId = keyRecord.id;

    // Check tenant scoping if URL has :tenant_id
    const targetTenantId = req.params.tenant_id;
    if (targetTenantId && targetTenantId !== req.tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You can only access data for your own tenant'
      });
    }

    // Update last_used_at async
    pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [keyRecord.id])
      .catch(err => console.error('Failed to update API key last_used_at:', err));

    next();
  } catch (error) {
    console.error('requireTenantOrAdmin middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = {
  extractToken,
  requireApiKey,
  requireAdminAuth,
  requireTenantOrAdmin,
};
