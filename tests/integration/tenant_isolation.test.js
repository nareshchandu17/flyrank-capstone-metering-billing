const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const { ROLES, PERMISSIONS } = require('../../src/config/permissions');
const { publicKey, createTestToken } = require('../helpers/authHelper');
const apiKeyService = require('../../src/services/apiKeyService');
const membershipService = require('../../src/services/membershipService');
const meterService = require('../../src/services/meterService');

describe('End-to-End Tenant Isolation Security Test Suite', () => {
  let acmeTenantId;
  let betaTenantId;
  let suspendedTenantId;

  let acmeOwnerToken;
  let acmeBillingToken;
  let acmeDevToken;
  let acmeViewerToken;
  let acmeSuspendedMemberToken;
  let betaOwnerToken;
  let strangerToken;

  let acmeOwnerUser;
  let acmeBillingUser;
  let acmeDevUser;
  let acmeViewerUser;
  let strangerUser;

  let acmeApiKeyRecord;
  let acmeRevokedApiKeyRecord;
  let suspendedTenantApiKeyRecord;

  let acmeInvoiceId;
  let betaInvoiceId;

  beforeAll(async () => {
    // 1. Enable local cryptographic RS256 JWT verification for tests
    process.env.AUTH0_TEST_PUBLIC_KEY = publicKey;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Ensure test plans exist
      const planRes = await client.query(
        `INSERT INTO plans (name, api_calls_limit, ai_tokens_limit, allow_overage)
         VALUES ('Isolation Test Plan', 100000, 1000000, true)
         ON CONFLICT (name) DO UPDATE SET api_calls_limit = EXCLUDED.api_calls_limit
         RETURNING id`
      );
      const planId = planRes.rows[0].id;

      // 3. Create Tenants: Acme AI (Tenant A), Beta Labs (Tenant B), Suspended Corp
      const tAcme = await client.query(
        `INSERT INTO tenants (name, email, plan_id, status)
         VALUES ('Acme AI Test', 'billing@acme-test.ai', $1, 'active')
         RETURNING id`,
        [planId]
      );
      acmeTenantId = tAcme.rows[0].id;

      const tBeta = await client.query(
        `INSERT INTO tenants (name, email, plan_id, status)
         VALUES ('Beta Labs Test', 'billing@beta-test.io', $1, 'active')
         RETURNING id`,
        [planId]
      );
      betaTenantId = tBeta.rows[0].id;

      const tSuspended = await client.query(
        `INSERT INTO tenants (name, email, plan_id, status)
         VALUES ('Suspended Corp Test', 'billing@suspended-test.com', $1, 'suspended')
         RETURNING id`,
        [planId]
      );
      suspendedTenantId = tSuspended.rows[0].id;

      // 4. Create App Users
      const uAcmeOwner = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-acme-owner', 'owner@acme-test.ai', 'Acme Owner')
         RETURNING id, auth0_sub, email`
      );
      acmeOwnerUser = uAcmeOwner.rows[0];

      const uAcmeBilling = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-acme-billing', 'billing@acme-test.ai', 'Acme Billing')
         RETURNING id, auth0_sub, email`
      );
      acmeBillingUser = uAcmeBilling.rows[0];

      const uAcmeDev = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-acme-dev', 'dev@acme-test.ai', 'Acme Dev')
         RETURNING id, auth0_sub, email`
      );
      acmeDevUser = uAcmeDev.rows[0];

      const uAcmeViewer = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-acme-viewer', 'viewer@acme-test.ai', 'Acme Viewer')
         RETURNING id, auth0_sub, email`
      );
      acmeViewerUser = uAcmeViewer.rows[0];

      const uAcmeSuspended = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-acme-suspended', 'suspended@acme-test.ai', 'Acme Suspended')
         RETURNING id, auth0_sub, email`
      );

      const uBetaOwner = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-beta-owner', 'owner@beta-test.io', 'Beta Owner')
         RETURNING id, auth0_sub, email`
      );

      const uStranger = await client.query(
        `INSERT INTO app_users (auth0_sub, email, name)
         VALUES ('auth0|iso-stranger', 'stranger@external-test.com', 'Stranger')
         RETURNING id, auth0_sub, email`
      );
      strangerUser = uStranger.rows[0];

      // 5. Create Tenant Memberships in PostgreSQL
      await client.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role, status) VALUES
         ($1, $2, 'Tenant Owner', 'active'),
         ($1, $3, 'Billing Manager', 'active'),
         ($1, $4, 'Developer', 'active'),
         ($1, $5, 'Viewer', 'active'),
         ($1, $6, 'Developer', 'suspended'),
         ($7, $8, 'Tenant Owner', 'active'),
         ($9, $2, 'Tenant Owner', 'active')`,
        [
          acmeTenantId,
          acmeOwnerUser.id,
          acmeBillingUser.id,
          acmeDevUser.id,
          acmeViewerUser.id,
          uAcmeSuspended.rows[0].id,
          betaTenantId,
          uBetaOwner.rows[0].id,
          suspendedTenantId
        ]
      );

      // 6. Create test invoices for cross-tenant tests
      const invAcme = await client.query(
        `INSERT INTO invoices (tenant_id, amount_cents, status, billing_period)
         VALUES ($1, 5000, 'paid', '2026-11')
         RETURNING id`,
        [acmeTenantId]
      );
      acmeInvoiceId = invAcme.rows[0].id;

      const invBeta = await client.query(
        `INSERT INTO invoices (tenant_id, amount_cents, status, billing_period)
         VALUES ($1, 9000, 'paid', '2026-11')
         RETURNING id`,
        [betaTenantId]
      );
      betaInvoiceId = invBeta.rows[0].id;

      // 7. Create usage events for Acme and Beta
      await client.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key)
         VALUES ($1, 'api_call', 10, 'iso_acme_evt_1'),
                ($2, 'api_call', 25, 'iso_beta_evt_1')`,
        [acmeTenantId, betaTenantId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 8. Generate Auth0 signed tokens
    acmeOwnerToken = createTestToken({ sub: 'auth0|iso-acme-owner', email: 'owner@acme-test.ai' });
    acmeBillingToken = createTestToken({ sub: 'auth0|iso-acme-billing', email: 'billing@acme-test.ai' });
    acmeDevToken = createTestToken({ sub: 'auth0|iso-acme-dev', email: 'dev@acme-test.ai' });
    acmeViewerToken = createTestToken({ sub: 'auth0|iso-acme-viewer', email: 'viewer@acme-test.ai' });
    acmeSuspendedMemberToken = createTestToken({ sub: 'auth0|iso-acme-suspended', email: 'suspended@acme-test.ai' });
    betaOwnerToken = createTestToken({ sub: 'auth0|iso-beta-owner', email: 'owner@beta-test.io' });
    strangerToken = createTestToken({ sub: 'auth0|iso-stranger', email: 'stranger@external-test.com' });

    // 9. Generate API Keys
    acmeApiKeyRecord = await apiKeyService.createApiKey(acmeTenantId, 'Acme Active Key');
    acmeRevokedApiKeyRecord = await apiKeyService.createApiKey(acmeTenantId, 'Acme Key To Revoke');
    await apiKeyService.revokeApiKey(acmeTenantId, acmeRevokedApiKeyRecord.id);

    // Create an API key for suspended tenant by temporarily setting active, creating, and re-suspending
    await pool.query('UPDATE tenants SET status = \'active\' WHERE id = $1', [suspendedTenantId]);
    suspendedTenantApiKeyRecord = await apiKeyService.createApiKey(suspendedTenantId, 'Suspended Key');
    await pool.query('UPDATE tenants SET status = \'suspended\' WHERE id = $1', [suspendedTenantId]);
  });

  afterAll(async () => {
    delete process.env.AUTH0_TEST_PUBLIC_KEY;
    // Clean up test data
    if (acmeTenantId || betaTenantId || suspendedTenantId) {
      await pool.query('DELETE FROM usage_events WHERE tenant_id IN ($1, $2, $3)', [acmeTenantId, betaTenantId, suspendedTenantId]);
      await pool.query('DELETE FROM invoice_line_items WHERE invoice_id IN ($1, $2)', [acmeInvoiceId, betaInvoiceId]);
      await pool.query('DELETE FROM invoices WHERE tenant_id IN ($1, $2, $3)', [acmeTenantId, betaTenantId, suspendedTenantId]);
      await pool.query('DELETE FROM api_keys WHERE tenant_id IN ($1, $2, $3)', [acmeTenantId, betaTenantId, suspendedTenantId]);
      await pool.query('DELETE FROM tenant_invitations WHERE tenant_id IN ($1, $2, $3)', [acmeTenantId, betaTenantId, suspendedTenantId]);
      await pool.query('DELETE FROM tenant_memberships WHERE tenant_id IN ($1, $2, $3)', [acmeTenantId, betaTenantId, suspendedTenantId]);
      await pool.query('DELETE FROM tenants WHERE id IN ($1, $2, $3)', [acmeTenantId, betaTenantId, suspendedTenantId]);
      await pool.query('DELETE FROM app_users WHERE auth0_sub LIKE \'auth0|iso-%\'');
      await pool.query('DELETE FROM plans WHERE name = \'Isolation Test Plan\'');
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 1: Acme user accessing Acme data (Allowed: 200)
  // --------------------------------------------------------------------------
  it('Scenario 1: Acme user accessing Acme data is allowed (200)', async () => {
    const res = await request(app)
      .get(`/api/usage/${acmeTenantId}`)
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .set('X-Tenant-ID', acmeTenantId);

    expect(res.status).toBe(200);
    expect(res.body.tenant?.id || res.body.tenant_id).toBe(acmeTenantId);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: Acme user accessing Beta data (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 2: Acme user accessing Beta data is strictly denied (403)', async () => {
    const res = await request(app)
      .get(`/api/usage/${betaTenantId}`)
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .set('X-Tenant-ID', betaTenantId);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: Acme Developer attempting billing modification (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 3: Acme Developer attempting billing checkout/modification is denied (403)', async () => {
    const res = await request(app)
      .post('/api/stripe/checkout')
      .set('Authorization', `Bearer ${acmeDevToken}`)
      .set('X-Tenant-ID', acmeTenantId)
      .send({ plan_name: 'Pro' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 4: Acme Billing Manager attempting member management (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 4: Acme Billing Manager attempting member invitation is denied (403)', async () => {
    const res = await request(app)
      .post(`/api/tenants/${acmeTenantId}/invitations`)
      .set('Authorization', `Bearer ${acmeBillingToken}`)
      .set('X-Tenant-ID', acmeTenantId)
      .send({ email: 'newbie@acme-test.ai', role: 'Viewer' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 5: Acme Viewer attempting API-key creation (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 5: Acme Viewer attempting API-key creation is denied (403)', async () => {
    const res = await request(app)
      .post(`/api/tenants/${acmeTenantId}/api-keys`)
      .set('Authorization', `Bearer ${acmeViewerToken}`)
      .set('X-Tenant-ID', acmeTenantId)
      .send({ name: 'Malicious Key' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 6: User with no membership attempting tenant access (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 6: User with no membership attempting tenant access is denied (403)', async () => {
    const res = await request(app)
      .get(`/api/usage/${acmeTenantId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Tenant-ID', acmeTenantId);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 7: Suspended membership attempting access (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 7: Suspended membership attempting tenant access is denied (403)', async () => {
    const res = await request(app)
      .get(`/api/usage/${acmeTenantId}`)
      .set('Authorization', `Bearer ${acmeSuspendedMemberToken}`)
      .set('X-Tenant-ID', acmeTenantId);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 8: Suspended tenant attempting human-user access (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 8: Suspended tenant attempting human-user access is denied (403)', async () => {
    const res = await request(app)
      .get(`/api/usage/${suspendedTenantId}`)
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .set('X-Tenant-ID', suspendedTenantId);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended|inactive/i);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 9: Suspended tenant attempting API-key access (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 9: Suspended tenant attempting API-key access is denied (403)', async () => {
    const res = await request(app)
      .post('/api/usage')
      .set('X-API-Key', suspendedTenantApiKeyRecord.api_key)
      .send({
        usage_type: 'api_call',
        quantity: 1,
        idempotency_key: `susp_test_${Date.now()}`
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended|inactive/i);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 10: Revoked API key attempting usage ingestion (Denied: 401)
  // --------------------------------------------------------------------------
  it('Scenario 10: Revoked API key attempting usage ingestion is denied (401)', async () => {
    const res = await request(app)
      .post('/api/usage')
      .set('X-API-Key', acmeRevokedApiKeyRecord.api_key)
      .send({
        usage_type: 'api_call',
        quantity: 1,
        idempotency_key: `rev_test_${Date.now()}`
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/revoked/i);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 11: Acme API key attempting to submit Beta tenant ID (Denied or locked to Acme)
  // --------------------------------------------------------------------------
  it('Scenario 11: Acme API key attempting to submit Beta tenant ID in body is rejected (403)', async () => {
    const res = await request(app)
      .post('/api/usage')
      .set('X-API-Key', acmeApiKeyRecord.api_key)
      .send({
        tenant_id: betaTenantId, // Spoofed tenant ID
        usage_type: 'api_call',
        quantity: 5,
        idempotency_key: `spoof_test_${Date.now()}`
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot submit usage for another tenant/i);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 12: Acme attempting to read/access Beta usage records (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 12: Acme user attempting to read Beta usage events is denied (403)', async () => {
    const res = await request(app)
      .get(`/api/usage/events/${betaTenantId}`)
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .set('X-Tenant-ID', betaTenantId);

    expect(res.status).toBe(403);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 13: Cross-tenant invoice access (Denied: 403 or 404)
  // --------------------------------------------------------------------------
  it('Scenario 13: Acme user attempting to view Beta invoice is denied or not found (404/403)', async () => {
    const res = await request(app)
      .get(`/api/invoices/detail/${betaInvoiceId}`)
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .set('X-Tenant-ID', acmeTenantId);

    // Scoped query returns 404 (does not exist in Acme scope) preventing leakage
    expect([403, 404]).toContain(res.status);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 14: Cross-tenant Stripe subscription modification (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 14: Cross-tenant Stripe subscription modification attempt is denied (403)', async () => {
    const res = await request(app)
      .post('/api/stripe/upgrade')
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .set('X-Tenant-ID', acmeTenantId)
      .send({
        tenant_id: betaTenantId, // Attempt to tamper with Beta tenant
        new_plan_name: 'Pro'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Access denied/i);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 15: Invitation acceptance using a different email (Denied: 403)
  // --------------------------------------------------------------------------
  it('Scenario 15: Invitation acceptance using a different email is denied (403)', async () => {
    // 1. Acme Owner invites 'alice@acme-test.ai'
    const inv = await membershipService.createInvitation(
      acmeTenantId,
      'alice@acme-test.ai',
      'Viewer',
      acmeOwnerUser
    );

    // 2. Stranger with email 'stranger@external-test.com' tries to accept Alice's invitation token
    await expect(
      membershipService.acceptInvitation(inv.token, strangerUser)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringMatching(/does not match/i)
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 16: Duplicate invitation acceptance (Prevented)
  // --------------------------------------------------------------------------
  it('Scenario 16: Duplicate invitation acceptance is prevented', async () => {
    // 1. Create invitation for Bob
    const inv = await membershipService.createInvitation(
      acmeTenantId,
      'bob@acme-test.ai',
      'Viewer',
      acmeOwnerUser
    );

    const bobUser = {
      id: strangerUser.id, // reuse UUID
      auth0_sub: 'auth0|bob',
      email: 'bob@acme-test.ai'
    };

    // 2. First acceptance succeeds
    const firstAccept = await membershipService.acceptInvitation(inv.token, bobUser);
    expect(firstAccept.success).toBe(true);

    // 3. Second acceptance with same token must fail
    await expect(
      membershipService.acceptInvitation(inv.token, bobUser)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/already accepted/i)
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 17: Concurrent Tenant Owner removal (Last active owner preserved)
  // --------------------------------------------------------------------------
  it('Scenario 17: Cannot remove or demote the last active Tenant Owner (400)', async () => {
    // Acme has only 1 Tenant Owner (acmeOwnerUser)
    const ownerMembership = await pool.query(
      'SELECT id FROM tenant_memberships WHERE tenant_id = $1 AND role = $2',
      [acmeTenantId, ROLES.TENANT_OWNER]
    );
    expect(ownerMembership.rows.length).toBe(1);
    const ownerMemberId = ownerMembership.rows[0].id;

    // Attempting to remove the last owner must be rejected
    await expect(
      membershipService.removeMember(acmeTenantId, ownerMemberId, acmeOwnerUser)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/Cannot remove the last active Tenant Owner/i)
    });

    // Attempting to demote the last owner must be rejected
    await expect(
      membershipService.updateMember(acmeTenantId, ownerMemberId, { role: 'Viewer' }, acmeOwnerUser)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/Cannot demote or suspend the last active Tenant Owner/i)
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 18: Duplicate usage requests (Idempotent 200, no duplicate billing)
  // --------------------------------------------------------------------------
  it('Scenario 18: Duplicate usage requests are idempotent and prevent double-billing', async () => {
    const idempotencyKey = `idem_iso_test_${Date.now()}`;

    // 1. First usage ingestion succeeds (201)
    const res1 = await request(app)
      .post('/api/usage')
      .set('X-API-Key', acmeApiKeyRecord.api_key)
      .send({
        usage_type: 'api_call',
        quantity: 10,
        idempotency_key: idempotencyKey
      });

    expect(res1.status).toBe(201);
    expect(res1.body.message).toMatch(/recorded/i);

    // 2. Retry with identical payload returns 200 duplicate without adding a new event
    const res2 = await request(app)
      .post('/api/usage')
      .set('X-API-Key', acmeApiKeyRecord.api_key)
      .send({
        usage_type: 'api_call',
        quantity: 10,
        idempotency_key: idempotencyKey
      });

    expect(res2.status).toBe(200);
    expect(res2.body.message).toMatch(/already recorded/i);

    // 3. Verify exactly 1 record exists in DB for this idempotency key
    const countRes = await pool.query(
      'SELECT COUNT(*) as count FROM usage_events WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    expect(parseInt(countRes.rows[0].count, 10)).toBe(1);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 19: Tenant creation failure (Transaction rollback, no orphan tenant)
  // --------------------------------------------------------------------------
  it('Scenario 19: Tenant creation failure rolls back completely leaving no orphan tenant', async () => {
    const failEmail = `fail-orphan-${Date.now()}@example.com`;

    // Attempt creation with invalid plan to trigger rollback
    const res = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${acmeOwnerToken}`)
      .send({
        name: 'Orphan Attempt Tenant',
        email: failEmail,
        plan: 'NonExistentPlan12345'
      });

    expect(res.status).toBe(400);

    // Verify tenant was never committed to DB
    const checkTenant = await pool.query('SELECT id FROM tenants WHERE email = $1', [failEmail]);
    expect(checkTenant.rows.length).toBe(0);
  });
});
