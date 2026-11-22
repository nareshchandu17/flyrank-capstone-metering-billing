const { auth: expressAuth } = require('express-oauth2-jwt-bearer');
const crypto = require('crypto');
const pool = require('../config/database');
const userService = require('../services/userService');
const { ROLES, hasPermission } = require('../config/permissions');

// 1. Initialize Auth0 JWT verifier with express-oauth2-jwt-bearer
let jwtCheck = null;

function getJwtCheck() {
  if (jwtCheck) return jwtCheck;

  // Support local RS256 verification strictly in test environments without external JWKS network requests
  if (process.env.NODE_ENV === 'test' && process.env.AUTH0_TEST_PUBLIC_KEY) {
    const jwt = require('jsonwebtoken');
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error('Missing or invalid Authorization header');
        err.status = 401;
        return next(err);
      }
      const token = authHeader.split(' ')[1];
      try {
        const expectedIssuer = process.env.AUTH0_ISSUER_BASE_URL || (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : undefined);
        const expectedAudience = process.env.AUTH0_AUDIENCE;
        const decoded = jwt.verify(token, process.env.AUTH0_TEST_PUBLIC_KEY, {
          algorithms: ['RS256'],
          audience: expectedAudience,
          issuer: expectedIssuer
        });
        req.auth = { payload: decoded };
        return next();
      } catch (err) {
        err.status = 401;
        return next(err);
      }
    };
  }

  const issuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL || (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : null);
  const audience = process.env.AUTH0_AUDIENCE;

  if (!issuerBaseURL || !audience) {
    // In test or incomplete config, return a dynamic check handler
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing Authorization header' });
      }
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Auth0 issuer or audience is not configured on the server'
      });
    };
  }

  jwtCheck = expressAuth({
    audience,
    issuerBaseURL,
    tokenSigningAlg: 'RS256'
  });

  return jwtCheck;
}

/**
 * Custom wrapper for Auth0 JWT verification that syncs the authenticated user with PostgreSQL
 */
const requireAuth0User = (req, res, next) => {
  const handler = getJwtCheck();
  handler(req, res, async (err) => {
    if (err) {
      console.warn('Auth0 JWT verification rejected:', err.message);
      const statusCode = err.status || err.statusCode || 401;
      return res.status(statusCode).json({
        error: 'Unauthorized',
        message: err.message || 'Invalid or expired Auth0 access token'
      });
    }

    try {
      // verified payload is attached by express-oauth2-jwt-bearer to req.auth.payload
      const payload = req.auth?.payload || {};
      const sub = payload.sub;

      if (!sub) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token does not contain a subject (sub) claim'
        });
      }

      let email = payload.email || 
        payload[`${process.env.AUTH0_AUDIENCE}/email`] || 
        payload['https://flyrank.com/email'] || 
        payload['https://api.flyrank-metering/email'] || 
        null;

      let name = payload.name || 
        payload[`${process.env.AUTH0_AUDIENCE}/name`] || 
        payload['https://flyrank.com/name'] || 
        payload['https://api.flyrank-metering/name'] || 
        payload.nickname || 
        null;

      let picture = payload.picture || null;

      // If email is not present in the access token, query the standard OIDC /userinfo endpoint
      const issuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL || (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : null);
      if (!email && issuerBaseURL && req.headers.authorization) {
        try {
          const userinfoUrl = new URL('/userinfo', issuerBaseURL).toString();
          const infoRes = await fetch(userinfoUrl, {
            headers: { Authorization: req.headers.authorization }
          });
          if (infoRes.ok) {
            const info = await infoRes.json();
            if (info.email) email = info.email;
            if (info.name && !name) name = info.name;
            if (info.picture && !picture) picture = info.picture;
          }
        } catch {
          // Gracefully fallback on sub-derived identifier if userinfo is unavailable
        }
      }

      // Synchronize authenticated user with PostgreSQL app_users table
      const appUser = await userService.syncUserFromAuth0({
        sub,
        email,
        name,
        picture
      });

      req.user = appUser;
      req.isPlatformAdmin = Boolean(appUser.isPlatformAdmin);
      next();
    } catch (syncErr) {
      console.error('Error synchronizing Auth0 user in database:', syncErr);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to synchronize authenticated user session'
      });
    }
  });
};

/**
 * Middleware requiring verified Platform Admin status in PostgreSQL.
 */
const requirePlatformAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (!req.isPlatformAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Platform Admin privileges required for this operation'
    });
  }

  next();
};

/**
 * Helper to resolve the target tenant ID from request context.
 * Prioritizes URL path parameters, explicit headers, and query parameters.
 * Never trusts request-body tenant_id as an authorization shortcut.
 */
function resolveTargetTenantId(req) {
  return (
    req.params.tenant_id ||
    req.params.id ||
    req.headers['x-tenant-id'] ||
    req.query.tenant_id ||
    null
  );
}

    /**
     * Middleware to require a specific RBAC permission within a tenant context.
     * 
     * Rules:
     * 1. Platform Admins have global access and bypass tenant membership requirements.
     * 2. Regular users must have an active membership in the target tenant and hold a role with the required permission.
     * 3. Rejects requests if tenant is inactive or suspended.
     * 4. Never trusts client-claimed roles or request-body tenant manipulation.
     * 
     * @param {string} requiredPermission - From permissions.js
     */
    const requirePermission = (requiredPermission) => {
      return async (req, res, next) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
        }

        // Platform Admin has global permissions
        if (req.isPlatformAdmin) {
          req.currentRole = ROLES.PLATFORM_ADMIN;
          req.tenantId = resolveTargetTenantId(req);
          return next();
        }

        const tenantId = resolveTargetTenantId(req);
        if (!tenantId) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Tenant context (tenant_id) is required for this operation'
          });
        }

          // Prevent request-body manipulation to choose another tenant
          if (req.body?.tenant_id && req.body.tenant_id !== tenantId) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'Access denied: Request body tenant_id does not match authorized tenant context'
            });
          }

          try {
            const membership = await userService.getUserMembershipForTenant(req.user.id, tenantId);

            if (!membership || membership.membership_status !== 'active') {
              return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: You do not have an active membership in this tenant'
              });
            }

      if (membership.tenant_status !== 'active') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant account is inactive or suspended'
        });
      }

      if (!hasPermission(membership.role, requiredPermission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied: Role "${membership.role}" lacks required permission "${requiredPermission}"`
        });
      }

      req.currentRole = membership.role;
      req.tenantId = tenantId;
      req.tenantMembership = membership;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Authorization error' });
    }
  };
};

/**
 * Middleware for machine-to-machine API Key authentication (for usage ingestion, /api/usage, etc.)
 */
const requireApiKey = async (req, res, next) => {
  try {
    let apiKey = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.split(' ')[1].trim();
    } else if (req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'].trim();
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected format: Bearer <API_KEY>'
      });
    }

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

    pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [keyRecord.id])
      .catch(err => console.error('Failed to update API key last_used_at:', err));

    next();
  } catch (error) {
    console.error('requireApiKey middleware error:', error);
    res.status(500).json({ error: 'Internal server error during API key authentication' });
  }
};

/**
 * Unified middleware allowing EITHER an Auth0 human user (with permitted role)
 * OR a valid machine API key for tenant-scoped operations.
 * 
 * @param {string} requiredPermission - Required permission if authenticated as Auth0 human user
 */
const requireTenantOrApiKey = (requiredPermission) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];

    // If explicit X-API-Key header is provided or token has sk_live_ prefix, treat as machine API key
    if (xApiKey || (authHeader && authHeader.includes('sk_live_'))) {
      return requireApiKey(req, res, next);
    }

    // Otherwise, authenticate as Auth0 User with database-backed permission check
    return requireAuth0User(req, res, () => {
      return requirePermission(requiredPermission)(req, res, next);
    });
  };
};

module.exports = {
  requireAuth0User,
  requirePlatformAdmin,
  requirePermission,
  requireApiKey,
  requireTenantOrApiKey,
  resolveTargetTenantId
};
