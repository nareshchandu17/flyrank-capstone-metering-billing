const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const stripeService = require('../src/services/stripeService');
const crypto = require('crypto');

describe('Phase 1 - Security and Platform Runnability', () => {
  let tenantA;
  let tenantB;
  let tenantAKey;
  let tenantBKey;
  let planId;
  const adminKey = process.env.ADMIN_API_KEY || 'test-admin-api-key';

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query("DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'sec-test-%')");
    await pool.query("DELETE FROM invoices WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'sec-test-%')");
    await pool.query("DELETE FROM api_keys WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'sec-test-%')");
    await pool.query("DELETE FROM tenants WHERE email LIKE 'sec-test-%'");
    await pool.query("DELETE FROM plans WHERE name = 'Sec Test Plan'");

    // Create test plan
    const planRes = await pool.query(
      "INSERT INTO plans (name, api_calls_limit, ai_tokens_limit, allow_overage) VALUES ('Sec Test Plan', 1000, 100000, false) RETURNING id"
    );
    planId = planRes.rows[0].id;

    // Create Tenant A
    const resA = await pool.query(
      "INSERT INTO tenants (name, email, plan_id) VALUES ('Tenant A', 'sec-test-a@example.com', $1) RETURNING id",
      [planId]
    );
    tenantA = resA.rows[0];

    // Create Tenant B
    const resB = await pool.query(
      "INSERT INTO tenants (name, email, plan_id) VALUES ('Tenant B', 'sec-test-b@example.com', $1) RETURNING id",
      [planId]
    );
    tenantB = resB.rows[0];
  });

  afterAll(async () => {
    await pool.query("DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'sec-test-%')");
    await pool.query("DELETE FROM invoices WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'sec-test-%')");
    await pool.query("DELETE FROM api_keys WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'sec-test-%')");
    await pool.query("DELETE FROM tenants WHERE email LIKE 'sec-test-%'");
    await pool.query("DELETE FROM plans WHERE name = 'Sec Test Plan'");
  });

  describe('1. Administrative Operations Authentication & Authorization', () => {
    it('should reject unauthenticated requests to GET /api/admin/tenants with 401', async () => {
      const res = await request(app).get('/api/admin/tenants');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should reject unauthenticated requests to POST /api/admin/tenants with 401', async () => {
      const res = await request(app)
        .post('/api/admin/tenants')
        .send({ name: 'Hacker Tenant', email: 'hacker@example.com' });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated requests to GET /api/admin/metrics with 401', async () => {
      const res = await request(app).get('/api/admin/metrics');
      expect(res.status).toBe(401);
    });

    it('should reject requests with invalid administrative credentials with 401', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Authorization', 'Bearer invalid-admin-key');
      expect(res.status).toBe(401);
    });

    it('should allow administrative requests with valid admin credentials', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${adminKey}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('2. API-Key Creation, Listing, Rotation, and Revocation', () => {
    let keyId;
    let rawApiKey;

    it('should allow admin to create an API key for Tenant A', async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantA.id}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'Tenant A Primary Key' });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.api_key).toMatch(/^sk_live_/);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.prefix).toBeDefined();

      keyId = res.body.data.id;
      rawApiKey = res.body.data.api_key;
      tenantAKey = rawApiKey;
    });

    it('should allow Tenant A to use their API key for authenticated endpoints', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantAKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 1,
          idempotency_key: `key-test-${Date.now()}`
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tenant_id).toBe(tenantA.id);
    });

    it('should list API keys for a tenant without exposing secret hash', async () => {
      const res = await request(app)
        .get(`/api/tenants/${tenantA.id}/api-keys`)
        .set('Authorization', `Bearer ${tenantAKey}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].key_hash).toBeUndefined();
      expect(res.body.data[0].prefix).toBeDefined();
    });

    it('should rotate an API key: old key revoked, new key active and working', async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantA.id}/api-keys/${keyId}/rotate`)
        .set('Authorization', `Bearer ${tenantAKey}`);

      expect(res.status).toBe(200);
      expect(res.body.data.old_key.status).toBe('revoked');
      expect(res.body.data.new_key.status).toBe('active');
      expect(res.body.data.new_key.api_key).toMatch(/^sk_live_/);

      const newKey = res.body.data.new_key.api_key;

      // The old key must now fail with 401
      const oldKeyRes = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 1,
          idempotency_key: `old-key-${Date.now()}`
        });
      expect(oldKeyRes.status).toBe(401);
      expect(oldKeyRes.body.message).toContain('revoked');

      // The new key must work
      const newKeyRes = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${newKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 1,
          idempotency_key: `new-key-${Date.now()}`
        });
      expect(newKeyRes.status).toBe(201);

      // Update tenantAKey to new working key for subsequent tests
      tenantAKey = newKey;
      keyId = res.body.data.new_key.id;
    });

    it('should revoke an API key and ensure it can no longer be used (Definition of Done)', async () => {
      // Create a temporary key to explicitly revoke
      const createRes = await request(app)
        .post(`/api/tenants/${tenantA.id}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'To Be Revoked' });
      
      const tempKeyId = createRes.body.data.id;
      const tempApiKey = createRes.body.data.api_key;

      // Verify it works initially
      const workingRes = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tempApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 1,
          idempotency_key: `temp-before-revoke-${Date.now()}`
        });
      expect(workingRes.status).toBe(201);

      // Revoke the key
      const revokeRes = await request(app)
        .delete(`/api/tenants/${tenantA.id}/api-keys/${tempKeyId}`)
        .set('Authorization', `Bearer ${tenantAKey}`);
      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.data.status).toBe('revoked');

      // Now verify the revoked key fails with 401
      const failedRes = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tempApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 1,
          idempotency_key: `temp-after-revoke-${Date.now()}`
        });
      expect(failedRes.status).toBe(401);
      expect(failedRes.body.message).toContain('revoked');
    });
  });

  describe('3. Secure Tenant Scoping for Usage Summaries and Invoices', () => {
    beforeAll(async () => {
      // Create key for Tenant B
      const res = await request(app)
        .post(`/api/tenants/${tenantB.id}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'Tenant B Key' });
      tenantBKey = res.body.data.api_key;
    });

    it('should reject unauthenticated requests to GET /api/usage/:tenant_id with 401', async () => {
      const res = await request(app).get(`/api/usage/${tenantA.id}`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated requests to GET /api/invoices/:tenant_id with 401', async () => {
      const res = await request(app).get(`/api/invoices/${tenantA.id}`);
      expect(res.status).toBe(401);
    });

    it('should prevent Tenant A from accessing Tenant B usage summary (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/usage/${tenantB.id}`)
        .set('Authorization', `Bearer ${tenantAKey}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('own tenant');
    });

    it('should prevent Tenant A from accessing Tenant B invoices (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/invoices/${tenantB.id}`)
        .set('Authorization', `Bearer ${tenantAKey}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('own tenant');
    });

    it('should allow Tenant A to access their own usage summary', async () => {
      const res = await request(app)
        .get(`/api/usage/${tenantA.id}`)
        .set('Authorization', `Bearer ${tenantAKey}`);

      expect(res.status).toBe(200);
      expect(res.body.tenant.id).toBe(tenantA.id);
    });

    it('should allow Tenant A to call /api/usage without parameter and automatically scope to Tenant A', async () => {
      const res = await request(app)
        .get('/api/usage')
        .set('Authorization', `Bearer ${tenantAKey}`);

      expect(res.status).toBe(200);
      expect(res.body.tenant.id).toBe(tenantA.id);
    });

    it('should allow Admin to view any tenant usage summary', async () => {
      const res = await request(app)
        .get(`/api/usage/${tenantB.id}`)
        .set('Authorization', `Bearer ${adminKey}`);

      expect(res.status).toBe(200);
      expect(res.body.tenant.id).toBe(tenantB.id);
    });
  });

  describe('4. Stripe Configuration & Raw Body Handling', () => {
    it('should support configurable Stripe price IDs from environment', () => {
      const freePrice = stripeService.getPriceId('Free');
      const proPrice = stripeService.getPriceId('Pro');
      expect(freePrice).toBeDefined();
      expect(proPrice).toBeDefined();
    });

    it('should start and operate gracefully even when Stripe is not configured', async () => {
      const originalSecret = process.env.STRIPE_SECRET_KEY;
      try {
        delete process.env.STRIPE_SECRET_KEY;
        expect(stripeService.isConfigured()).toBe(false);

        // Attempting checkout when Stripe is not configured returns 503 instead of crashing
        const res = await request(app)
          .post('/api/stripe/checkout')
          .send({ tenant_id: tenantA.id, plan_name: 'Pro' });

        expect(res.status).toBe(503);
        expect(res.body.error).toContain('Stripe is not configured');
      } finally {
        process.env.STRIPE_SECRET_KEY = originalSecret;
      }
    });

    it('should preserve raw body on /api/stripe/webhooks for signature verification', async () => {
      const rawPayload = JSON.stringify({ id: 'evt_test', type: 'test.event' });
      const res = await request(app)
        .post('/api/stripe/webhooks')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=123,v1=invalid_sig')
        .send(rawPayload);

      // Fails with 400 Invalid signature (not 500 parse error)
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid signature');
    });
  });
});
