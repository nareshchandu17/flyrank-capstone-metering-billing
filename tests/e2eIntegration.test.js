const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const invoiceService = require('../src/services/invoiceService');
const stripeService = require('../src/services/stripeService');
const { calculateAITokenCost, calculateAPICallCost } = require('../src/config/pricing');
const crypto = require('crypto');

// Mock Stripe for testing
jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn((payload, signature, secret) => {
        if (!signature || signature === 'invalid_sig') {
          throw new Error('Invalid signature');
        }
        return Buffer.isBuffer(payload) ? JSON.parse(payload.toString()) : (typeof payload === 'string' ? JSON.parse(payload) : payload);
      })
    },
    customers: {
      create: jest.fn(async (data) => ({
        id: `cus_e2e_${Date.now()}`,
        ...data
      }))
    },
    checkout: {
      sessions: {
        create: jest.fn(async (data) => ({
          id: `cs_e2e_${Date.now()}`,
          url: `https://checkout.stripe.com/pay/cs_e2e_${Date.now()}`,
          ...data
        }))
      }
    },
    subscriptions: {
      retrieve: jest.fn(async (id) => ({
        id,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: {
          data: [{ id: 'si_1', price: { id: process.env.STRIPE_PRICE_PRO || 'price_pro' } }]
        }
      })),
      list: jest.fn(async () => ({ data: [] }))
    },
    invoices: {
      create: jest.fn(async (data) => ({
        id: `in_e2e_${Date.now()}`,
        status: 'draft',
        amount_due: 1000,
        hosted_invoice_url: `https://invoice.stripe.com/in_e2e_${Date.now()}`,
        ...data
      })),
      finalizeInvoice: jest.fn(async (id) => ({
        id,
        status: 'open',
        hosted_invoice_url: `https://invoice.stripe.com/${id}`
      }))
    },
    invoiceItems: {
      create: jest.fn(async (data) => ({
        id: `ii_e2e_${Date.now()}`,
        ...data
      }))
    }
  }));
});

describe('Phase 5 — Full Application End-to-End Release Gate', () => {
  const adminKey = process.env.ADMIN_API_KEY || 'test-admin-api-key';
  let freePlanId;
  let proPlanId;
  let tenantId;
  let rawTenantApiKey;
  let keyId;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = adminKey;
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

    const freeRes = await pool.query("SELECT id FROM plans WHERE name = 'Free'");
    const proRes = await pool.query("SELECT id FROM plans WHERE name = 'Pro'");
    freePlanId = freeRes.rows[0].id;
    proPlanId = proRes.rows[0].id;
  });

  afterAll(async () => {
    if (tenantId) {
      await pool.query('DELETE FROM webhook_events WHERE stripe_event_id LIKE $1', ['evt_e2e_%']);
      await pool.query('DELETE FROM invoices WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM usage_alerts WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM usage_events WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM api_keys WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    }
  });

  describe('1. Main API Workflows: Tenant Provisioning & API Key Management', () => {
    it('creates a new tenant via authorized Admin API', async () => {
      const email = `e2e-tenant-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminKey}`)
        .send({
          name: 'E2E Enterprise Corp',
          email,
          plan_id: freePlanId
        });

      expect(res.status).toBe(201);
      const tenantData = res.body.data || res.body;
      expect(tenantData.id).toBeDefined();
      expect(tenantData.name).toBe('E2E Enterprise Corp');
      tenantId = tenantData.id;
    });

    it('generates a tenant API key and returns plaintext secret once', async () => {
      const res = await request(app)
        .post(`/api/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'E2E Primary Key' });

      expect(res.status).toBe(201);
      expect(res.body.data.api_key).toMatch(/^sk_live_[a-f0-9]{48}$/);
      expect(res.body.data.id).toBeDefined();
      rawTenantApiKey = res.body.data.api_key;
      keyId = res.body.data.id;

      // Verify that database does NOT store the plaintext key
      const dbKey = await pool.query('SELECT key_hash, prefix FROM api_keys WHERE id = $1', [keyId]);
      expect(dbKey.rows[0].key_hash).not.toBe(rawTenantApiKey);
      expect(dbKey.rows[0].prefix).toBe(rawTenantApiKey.substring(0, 12));
    });

    it('rejects unauthorized requests attempting to use invalid or missing credentials', async () => {
      const res = await request(app)
        .get(`/api/usage`)
        .set('Authorization', 'Bearer invalid-key');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('2. Metering Engine: Real Usage Ingestion & Pricing Regression', () => {
    it('records valid positive integer API calls using tenant credentials', async () => {
      const idemKey = `e2e-api-call-${Date.now()}`;
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 25,
          idempotency_key: idemKey
        });

      expect(res.status).toBe(201);
      expect(res.body.data.quantity).toBe(25);
      expect(res.body.data.usage_type).toBe('api_call');
    });

    it('records rich AI token usage with breakdown metadata', async () => {
      const idemKey = `e2e-ai-tokens-${Date.now()}`;
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 75000,
          idempotency_key: idemKey,
          metadata: {
            input_tokens: 50000,
            cached_input_tokens: 10000,
            output_tokens: 10000,
            reasoning_tokens: 5000
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.quantity).toBe(75000);
    });

    it('accurately calculates costs without zero-rounding regressions', async () => {
      const res = await request(app)
        .get('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.usage.api_calls.used).toBe(25);
      expect(res.body.usage.ai_tokens.used).toBe(75000);

      // Verify exact cost calculation:
      // 25 calls * 1 cent = 25 cents
      expect(res.body.costs.api_calls_cents).toBe(25);

      // AI token cost breakdown:
      // 50,000 input @ 30c/1M = 1.5 cents
      // 10,000 cached @ 10c/1M = 0.1 cents
      // 10,000 output @ 60c/1M = 0.6 cents
      // 5,000 reasoning @ 60c/1M = 0.3 cents
      // Total AI = 2.5 cents = 25,000 micro-cents
      expect(res.body.costs.ai_tokens_micro_cents).toBe(25000);
      expect(res.body.costs.ai_tokens_cents_exact).toBeCloseTo(2.5, 4);
    });
  });

  describe('3. Regression: Duplicate Idempotency & Conflicting Retries', () => {
    it('returns exact original event without double-charging on duplicate retry', async () => {
      const idemKey = `e2e-dup-${Date.now()}`;

      // First call
      const res1 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10,
          idempotency_key: idemKey
        });
      expect(res1.status).toBe(201);

      // Replay identical call
      const res2 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10,
          idempotency_key: idemKey
        });
      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('already recorded');
      expect(res2.body.data.id).toBe(res1.body.data.id);
    });

    it('rejects conflicting retries with same idempotency key and modified payload (409 Conflict)', async () => {
      const idemKey = `e2e-conflict-${Date.now()}`;

      await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 5,
          idempotency_key: idemKey
        });

      const conflictRes = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 50,
          idempotency_key: idemKey
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error).toContain('Idempotency conflict');
    });
  });

  describe('4. Quota Boundaries & Deduplicated Alert Enforcement', () => {
    it('triggers and deduplicates quota alert upon crossing 80% boundary', async () => {
      // Free plan limit is 100,000 tokens. Current is 75,000.
      // Ingest 10,000 more tokens to cross 85,000 (85% > 80% warning threshold)
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 10000,
          idempotency_key: `e2e-alert-trigger-${Date.now()}`,
          metadata: { input_tokens: 10000 }
        });
      expect(res.status).toBe(201);

      // Ingest another 2,000 tokens (still > 80%): should NOT create a duplicate alert
      await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${rawTenantApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 2000,
          idempotency_key: `e2e-alert-dup-${Date.now()}`,
          metadata: { input_tokens: 2000 }
        });

      // Verify DB contains exactly 1 alert for 80_percent on ai_tokens
      const currentMonth = new Date().toISOString().substring(0, 7);
      const alerts = await pool.query(
        'SELECT * FROM usage_alerts WHERE tenant_id = $1 AND metric_type = $2 AND billing_period = $3',
        [tenantId, 'ai_tokens', currentMonth]
      );
      expect(alerts.rows.length).toBe(1);
      expect(alerts.rows[0].alert_type).toBe('80_percent');
    });
  });

  describe('5. Billing in Test Mode: Invoicing & Stripe Subscription Lifecycle', () => {
    it('upgrades tenant to Pro via Stripe checkout session completed webhook', async () => {
      const subId = `sub_e2e_${Date.now()}`;
      const eventId = `evt_e2e_checkout_${Date.now()}`;

      const webhookPayload = {
        id: eventId,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_e2e_${Date.now()}`,
            customer: `cus_e2e_${Date.now()}`,
            subscription: subId,
            metadata: {
              tenant_id: tenantId,
              plan_name: 'Pro'
            }
          }
        }
      };

      const res = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify tenant is upgraded to Pro
      const tenantCheck = await pool.query('SELECT plan_id, status FROM tenants WHERE id = $1', [tenantId]);
      expect(tenantCheck.rows[0].plan_id).toBe(proPlanId);
      expect(tenantCheck.rows[0].status).toBe('active');
    });

    it('generates an accurate itemized invoice for the billing period with database uniqueness', async () => {
      const period = '2026-05';
      const usageDate = '2026-05-15T12:00:00.000Z';

      // Insert past usage for period 2026-05
      await pool.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, created_at)
         VALUES ($1, 'api_call', 100, $2, $3)`,
        [tenantId, `e2e-inv-api-${Date.now()}`, usageDate]
      );

      const invResult = await invoiceService.generateInvoice(tenantId, period);
      expect(invResult.status).toBe('created');
      expect(invResult.invoice.billing_period).toBe(period);
      expect(invResult.invoice.line_items.length).toBeGreaterThan(0);

      // Verify base subscription + usage line items
      const baseSubItem = invResult.invoice.line_items.find(l => l.description.includes('Subscription'));
      expect(baseSubItem).toBeDefined();

      const apiUsageItem = invResult.invoice.line_items.find(l => l.description.includes('API Calls'));
      expect(apiUsageItem).toBeDefined();
      expect(apiUsageItem.amount_cents).toBe(100); // 100 calls * 1c

      // Verify idempotency: calling generateInvoice again returns existing invoice
      const replayInv = await invoiceService.generateInvoice(tenantId, period);
      expect(replayInv.status).toBe('existing');
      expect(replayInv.invoice.id).toBe(invResult.invoice.id);
    });

    it('rejects replayed Stripe webhooks and protects against double processing', async () => {
      const eventId = `evt_e2e_replay_${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: `in_test_replay_${Date.now()}`,
            status: 'paid'
          }
        }
      };

      // First delivery
      const res1 = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(payload);
      expect(res1.status).toBe(200);

      // Replay delivery
      const res2 = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('duplicate');
    });
  });
});
