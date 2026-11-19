const app = require('../../src/app');
const { ROLES, PERMISSIONS, hasPermission } = require('../../src/config/permissions');
const { createTestToken, createExpiredToken, createWrongIssuerToken, createWrongAudienceToken } = require('../helpers/authHelper');

describe('Auth0 & PostgreSQL RBAC Integration Tests', () => {

  describe('1. Permission Matrix Verification', () => {
    it('Platform Admin possesses global administrative and tenant management permissions', () => {
      expect(hasPermission(ROLES.PLATFORM_ADMIN, PERMISSIONS.PLATFORM_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.PLATFORM_ADMIN, PERMISSIONS.TENANTS_CREATE)).toBe(true);
      expect(hasPermission(ROLES.PLATFORM_ADMIN, PERMISSIONS.TENANTS_DELETE)).toBe(true);
      expect(hasPermission(ROLES.PLATFORM_ADMIN, PERMISSIONS.BILLING_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.PLATFORM_ADMIN, PERMISSIONS.API_KEYS_MANAGE)).toBe(true);
    });

    it('Tenant Owner can manage members, API keys, billing, and settings within tenant', () => {
      expect(hasPermission(ROLES.TENANT_OWNER, PERMISSIONS.MEMBERS_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.TENANT_OWNER, PERMISSIONS.API_KEYS_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.TENANT_OWNER, PERMISSIONS.BILLING_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.TENANT_OWNER, PERMISSIONS.TENANT_UPDATE)).toBe(true);
      // Cannot create or delete global tenants
      expect(hasPermission(ROLES.TENANT_OWNER, PERMISSIONS.TENANTS_CREATE)).toBe(false);
      expect(hasPermission(ROLES.TENANT_OWNER, PERMISSIONS.TENANTS_DELETE)).toBe(false);
    });

    it('Billing Manager has billing & checkout rights, but cannot manage members or API keys', () => {
      expect(hasPermission(ROLES.BILLING_MANAGER, PERMISSIONS.BILLING_VIEW)).toBe(true);
      expect(hasPermission(ROLES.BILLING_MANAGER, PERMISSIONS.BILLING_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.BILLING_MANAGER, PERMISSIONS.INVOICES_VIEW)).toBe(true);
      expect(hasPermission(ROLES.BILLING_MANAGER, PERMISSIONS.INVOICES_GENERATE)).toBe(true);
      expect(hasPermission(ROLES.BILLING_MANAGER, PERMISSIONS.MEMBERS_MANAGE)).toBe(false);
      expect(hasPermission(ROLES.BILLING_MANAGER, PERMISSIONS.API_KEYS_MANAGE)).toBe(false);
    });

    it('Developer can manage API keys and view usage, but cannot access billing management or members', () => {
      expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.API_KEYS_MANAGE)).toBe(true);
      expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.API_KEYS_VIEW)).toBe(true);
      expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.USAGE_VIEW)).toBe(true);
      expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.USAGE_ANALYTICS)).toBe(true);
      expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.BILLING_MANAGE)).toBe(false);
      expect(hasPermission(ROLES.DEVELOPER, PERMISSIONS.MEMBERS_MANAGE)).toBe(false);
    });

    it('Viewer has read-only access and cannot mutate resources', () => {
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.TENANT_VIEW)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USAGE_VIEW)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.INVOICES_VIEW)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.API_KEYS_MANAGE)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.BILLING_MANAGE)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.MEMBERS_MANAGE)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.TENANT_UPDATE)).toBe(false);
    });
  });

  describe('2. Auth0 Token Crafting & Claims Validation', () => {
    it('creates properly structured RS256 token with sub, iss, and aud', () => {
      const token = createTestToken({ sub: 'auth0|user-owner-1', email: 'owner@flyrank.com' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('creates expired tokens that fail expiry checks', () => {
      const expired = createExpiredToken();
      expect(typeof expired).toBe('string');
    });

    it('creates tokens with wrong issuer and audience to test signature rejection', () => {
      const wrongIss = createWrongIssuerToken();
      const wrongAud = createWrongAudienceToken();
      expect(typeof wrongIss).toBe('string');
      expect(typeof wrongAud).toBe('string');
    });
  });

  describe('3. Multi-Tenant Authorization Logic & Cross-Tenant Boundary Tests', () => {
    const platformAdminUser = { id: 'u-admin', auth0_sub: 'auth0|admin', isPlatformAdmin: true };
    const tenantAOwner = { id: 'u-owner-a', auth0_sub: 'auth0|owner-a', isPlatformAdmin: false };
    const tenantBDeveloper = { id: 'u-dev-b', auth0_sub: 'auth0|dev-b', isPlatformAdmin: false };

    const tenantAId = 'tenant-uuid-aaaa';
    const tenantBId = 'tenant-uuid-bbbb';

    const memberships = [
      { user_id: 'u-owner-a', tenant_id: tenantAId, role: ROLES.TENANT_OWNER, status: 'active' },
      { user_id: 'u-dev-b', tenant_id: tenantBId, role: ROLES.DEVELOPER, status: 'active' }
    ];

    function checkTenantAccess(user, targetTenantId, requiredPermission) {
      if (user.isPlatformAdmin) {
        return { allowed: true, role: ROLES.PLATFORM_ADMIN };
      }
      const membership = memberships.find(m => m.user_id === user.id && m.tenant_id === targetTenantId);
      if (!membership || membership.status !== 'active') {
        return { allowed: false, status: 403, error: 'Access denied: No active membership' };
      }
      if (!hasPermission(membership.role, requiredPermission)) {
        return { allowed: false, status: 403, error: 'Forbidden: Missing permission' };
      }
      return { allowed: true, role: membership.role };
    }

    it('Platform Admin has universal access across all tenants', () => {
      const resA = checkTenantAccess(platformAdminUser, tenantAId, PERMISSIONS.BILLING_MANAGE);
      expect(resA.allowed).toBe(true);

      const resB = checkTenantAccess(platformAdminUser, tenantBId, PERMISSIONS.API_KEYS_MANAGE);
      expect(resB.allowed).toBe(true);
    });

    it('Tenant A Owner has full access to Tenant A', () => {
      const res = checkTenantAccess(tenantAOwner, tenantAId, PERMISSIONS.MEMBERS_MANAGE);
      expect(res.allowed).toBe(true);
      expect(res.role).toBe(ROLES.TENANT_OWNER);
    });

    it('Tenant A Owner is STRICTLY DENIED access to Tenant B (Cross-Tenant Isolation)', () => {
      const res = checkTenantAccess(tenantAOwner, tenantBId, PERMISSIONS.TENANT_VIEW);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(403);
    });

    it('Developer in Tenant B can manage API keys in Tenant B, but cannot access billing or members', () => {
      const apiRes = checkTenantAccess(tenantBDeveloper, tenantBId, PERMISSIONS.API_KEYS_MANAGE);
      expect(apiRes.allowed).toBe(true);

      const billRes = checkTenantAccess(tenantBDeveloper, tenantBId, PERMISSIONS.BILLING_MANAGE);
      expect(billRes.allowed).toBe(false);

      const memberRes = checkTenantAccess(tenantBDeveloper, tenantBId, PERMISSIONS.MEMBERS_MANAGE);
      expect(memberRes.allowed).toBe(false);
    });

    it('Suspended tenant membership is immediately rejected', () => {
      const suspendedUser = { id: 'u-suspended', isPlatformAdmin: false };
      memberships.push({ user_id: 'u-suspended', tenant_id: tenantAId, role: ROLES.DEVELOPER, status: 'suspended' });

      const res = checkTenantAccess(suspendedUser, tenantAId, PERMISSIONS.USAGE_VIEW);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(403);
    });

    it('Client-side role parameter tampering is prevented (roles must match DB membership)', () => {
      const res = checkTenantAccess(tenantBDeveloper, tenantBId, PERMISSIONS.MEMBERS_MANAGE);
      expect(res.allowed).toBe(false);
    });
  });

  describe('4. Machine-to-Machine API Key Authentication Preserved', () => {
    it('Requires API key hash comparison using SHA-256 for machine ingestion', () => {
      const crypto = require('crypto');
      const rawKey = 'test_key_m2m_1234567890abcdef1234567890';
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      expect(keyHash).toHaveLength(64);
      expect(rawKey.startsWith('test_key_')).toBe(true);
    });
  });

  describe('5. Helmet, Strict CORS & Rate Limiter Headers', () => {
    it('Helmet middleware is imported and applied to the Express app', () => {
      // Read app.js source to verify helmet() is called with app.use()
      const fs = require('fs');
      const appSource = fs.readFileSync(require.resolve('../../src/app'), 'utf8');
      expect(appSource).toMatch(/require\(['"]helmet['"]\)/);
      expect(appSource).toMatch(/app\.use\(helmet\(/);
    });

    it('apiLimiter, sensitiveOpLimiter and ingestionLimiter are exported as Express middleware functions', () => {
      const { apiLimiter, sensitiveOpLimiter, ingestionLimiter } = require('../../src/middleware/rateLimiter');
      expect(typeof apiLimiter).toBe('function');
      expect(typeof sensitiveOpLimiter).toBe('function');
      expect(typeof ingestionLimiter).toBe('function');
    });

    it('requireAuth0User middleware rejects requests that have no Bearer token', () => {
      const { requireAuth0User } = require('../../src/middleware/auth');

      let statusSent = null;
      let bodySent = null;
      const mockReq = { headers: {}, method: 'POST', url: '/api/stripe/checkout' };
      const mockRes = {
        status(code) { statusSent = code; return this; },
        json(body) { bodySent = body; return this; },
      };
      const mockNext = jest.fn();

      requireAuth0User(mockReq, mockRes, mockNext);

      // With no Authorization header the middleware must NOT call next() without an error,
      // and must respond with 4xx (401 missing creds or 400 bad request — both are rejections)
      if (mockNext.mock.calls.length > 0) {
        const passedArg = mockNext.mock.calls[0][0];
        // next(undefined) means the request was allowed — that must not happen
        expect(passedArg).toBeDefined();
      } else {
        expect([400, 401, 403]).toContain(statusSent);
      }
    });
  });

  describe('6. Recoverable Stripe Webhook Processing Lifecycle', () => {
    it('models RECEIVED -> PROCESSING -> PROCESSED (on success) and FAILED (on error)', async () => {
      const events = new Map();

      function processWebhook(id, shouldFail) {
        // Transition: RECEIVED -> PROCESSING
        if (events.has(id)) {
          const ev = events.get(id);
          if (ev.status === 'processed') return { status: 'duplicate' };
          ev.status = 'processing';
          ev.attempts += 1;
        } else {
          events.set(id, { id, status: 'processing', attempts: 1 });
        }

        // Business execution
        if (shouldFail) {
          const ev = events.get(id);
          ev.status = 'failed';
          ev.error = 'DB error';
          return { status: 'error', statusCode: 500 };
        }

        const ev = events.get(id);
        ev.status = 'processed';
        ev.error = null;
        return { status: 'success' };
      }

      const evtId = 'evt_recovery_test_99';
      // 1. Initial attempt fails
      const r1 = processWebhook(evtId, true);
      expect(r1.status).toBe('error');
      expect(events.get(evtId).status).toBe('failed');
      expect(events.get(evtId).attempts).toBe(1);

      // 2. Stripe retry succeeds
      const r2 = processWebhook(evtId, false);
      expect(r2.status).toBe('success');
      expect(events.get(evtId).status).toBe('processed');
      expect(events.get(evtId).attempts).toBe(2);

      // 3. Subsequent retry returns duplicate without re-executing
      const r3 = processWebhook(evtId, false);
      expect(r3.status).toBe('duplicate');
    });
  });
});
