const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const meterService = require('../src/services/meterService');
const { calculateTokenCost, calculateAITokenCost, PRICING_CONFIG } = require('../src/config/pricing');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Phase 2 — Metering and Pricing Trustworthiness', () => {
  let testTenantId;
  let testPlanId;
  let tenantApiKey;
  const adminKey = process.env.ADMIN_API_KEY || 'test-admin-api-key';

  beforeAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM usage_alerts WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'p2-test-%')");
    await pool.query("DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'p2-test-%')");
    await pool.query("DELETE FROM api_keys WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'p2-test-%')");
    await pool.query("DELETE FROM tenants WHERE email LIKE 'p2-test-%'");
    await pool.query("DELETE FROM plans WHERE name IN ('P2 Test Plan', 'P2 Strict Quota Plan')");

    // Create standard plan
    const planRes = await pool.query(
      "INSERT INTO plans (name, api_calls_limit, ai_tokens_limit, allow_overage) VALUES ('P2 Test Plan', 10000, 5000000, false) RETURNING id"
    );
    testPlanId = planRes.rows[0].id;

    // Create standard tenant
    const tenantRes = await pool.query(
      "INSERT INTO tenants (name, email, plan_id) VALUES ('P2 Tenant', 'p2-test-main@example.com', $1) RETURNING id",
      [testPlanId]
    );
    testTenantId = tenantRes.rows[0].id;

    // Create API key for tenant
    const keyRes = await request(app)
      .post(`/api/tenants/${testTenantId}/api-keys`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({ name: 'P2 Key' });
    tenantApiKey = keyRes.body.data.api_key;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM usage_alerts WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'p2-test-%')");
    await pool.query("DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'p2-test-%')");
    await pool.query("DELETE FROM api_keys WHERE tenant_id IN (SELECT id FROM tenants WHERE email LIKE 'p2-test-%')");
    await pool.query("DELETE FROM tenants WHERE email LIKE 'p2-test-%'");
    await pool.query("DELETE FROM plans WHERE name IN ('P2 Test Plan', 'P2 Strict Quota Plan')");
  });

  describe('1. Strict Input Validation', () => {
    it('should reject non-integer quantities (e.g. floats) with 400', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10.5,
          idempotency_key: `val-float-${Date.now()}`
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('positive integer');
    });

    it('should reject negative quantities with 400', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: -10,
          idempotency_key: `val-neg-${Date.now()}`
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('positive integer');
    });

    it('should reject zero quantity with 400', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 0,
          idempotency_key: `val-zero-${Date.now()}`
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('positive integer');
    });

    it('should reject string quantities with 400', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: '100',
          idempotency_key: `val-str-${Date.now()}`
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('positive integer');
    });

    it('should reject unsupported usage types with 400', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'gpu_seconds',
          quantity: 100,
          idempotency_key: `val-type-${Date.now()}`
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid usage_type');
    });

    it('should reject invalid metadata token values with 400', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 100,
          idempotency_key: `val-meta-${Date.now()}`,
          metadata: { input_tokens: -5 }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid metadata.input_tokens');
    });

    it('should accept valid positive integer usage with 201', async () => {
      const res = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 5,
          idempotency_key: `val-ok-${Date.now()}`
        });

      expect(res.status).toBe(201);
      expect(res.body.data.quantity).toBe(5);
    });
  });

  describe('2. Atomic Idempotency & Conflicting Retries', () => {
    it('should return original event without creating duplicate on identical retry', async () => {
      const key = `idem-same-${Date.now()}`;

      // First call
      const res1 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10,
          idempotency_key: key
        });
      expect(res1.status).toBe(201);
      const originalEventId = res1.body.data.id;

      // Duplicate call with exact same payload
      const res2 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10,
          idempotency_key: key
        });
      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('already recorded');
      expect(res2.body.data.id).toBe(originalEventId);

      // Verify DB contains only 1 event for this key
      const dbCheck = await pool.query(
        'SELECT COUNT(*) FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2',
        [testTenantId, key]
      );
      expect(parseInt(dbCheck.rows[0].count, 10)).toBe(1);
    });

    it('should reject conflicting retries using same key with different quantity (409 Conflict)', async () => {
      const key = `idem-conflict-qty-${Date.now()}`;

      // First call: quantity = 10
      const res1 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10,
          idempotency_key: key
        });
      expect(res1.status).toBe(201);

      // Conflicting call: same key, quantity = 25
      const res2 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 25,
          idempotency_key: key
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('Idempotency conflict');
    });

    it('should reject conflicting retries using same key with different usage_type (409 Conflict)', async () => {
      const key = `idem-conflict-type-${Date.now()}`;

      // First call: api_call
      const res1 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'api_call',
          quantity: 10,
          idempotency_key: key
        });
      expect(res1.status).toBe(201);

      // Conflicting call: same key, ai_tokens
      const res2 = await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tenantApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 10,
          idempotency_key: key
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('Idempotency conflict');
    });
  });

  describe('3. Concurrency-Safe Quota Enforcement', () => {
    let strictTenantId;
    let strictApiKey;

    beforeAll(async () => {
      // Create strict plan: limit of exactly 50 api calls, no overage allowed
      const planRes = await pool.query(
        "INSERT INTO plans (name, api_calls_limit, ai_tokens_limit, allow_overage) VALUES ('P2 Strict Quota Plan', 50, 1000, false) RETURNING id"
      );
      const strictPlanId = planRes.rows[0].id;

      const tenantRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id) VALUES ('Strict Tenant', 'p2-test-strict@example.com', $1) RETURNING id",
        [strictPlanId]
      );
      strictTenantId = tenantRes.rows[0].id;

      const keyRes = await request(app)
        .post(`/api/tenants/${strictTenantId}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'Strict Key' });
      strictApiKey = keyRes.body.data.api_key;
    });

    it('should prevent concurrent requests from bypassing quotas', async () => {
      // We send 20 concurrent requests, each requesting 5 units (total 100 units requested)
      // Since the quota is 50, exactly 10 requests must succeed (10 * 5 = 50) and 10 must be rejected!
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/usage')
            .set('Authorization', `Bearer ${strictApiKey}`)
            .send({
              usage_type: 'api_call',
              quantity: 5,
              idempotency_key: `concurrent-req-${i}-${Date.now()}`
            })
        );
      }

      const responses = await Promise.all(requests);

      const successful = responses.filter(r => r.status === 201);
      const rejected = responses.filter(r => r.status === 402 || r.status === 429);

      // Quota is 50, each request is 5: exactly 10 requests fit in the limit
      expect(successful.length).toBe(10);
      expect(rejected.length).toBe(10);

      // Verify that database total usage is EXACTLY 50 and did not exceed
      const usageCheck = await pool.query(
        "SELECT SUM(quantity) as total FROM usage_events WHERE tenant_id = $1 AND usage_type = 'api_call'",
        [strictTenantId]
      );
      expect(parseInt(usageCheck.rows[0].total, 10)).toBe(50);
    });
  });

  describe('4. Correct Token Aggregation (Input, Cached Input, Output, Reasoning)', () => {
    let tokenTenantId;
    let tokenApiKey;

    beforeAll(async () => {
      const tenantRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id) VALUES ('Token Tenant', 'p2-test-tokens@example.com', $1) RETURNING id",
        [testPlanId]
      );
      tokenTenantId = tenantRes.rows[0].id;

      const keyRes = await request(app)
        .post(`/api/tenants/${tokenTenantId}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'Token Key' });
      tokenApiKey = keyRes.body.data.api_key;
    });

    it('should correctly aggregate input, cached input, output, and reasoning tokens', async () => {
      // Event 1: 1,000 input, 500 cached, 200 output, 50 reasoning (total = 1,750)
      await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tokenApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 1750,
          idempotency_key: `tokens-1-${Date.now()}`,
          metadata: {
            input_tokens: 1000,
            cached_input_tokens: 500,
            output_tokens: 200,
            reasoning_tokens: 50
          }
        });

      // Event 2: 2,000 input, 1,000 cached, 400 output, 100 reasoning (total = 3,500)
      await request(app)
        .post('/api/usage')
        .set('Authorization', `Bearer ${tokenApiKey}`)
        .send({
          usage_type: 'ai_tokens',
          quantity: 3500,
          idempotency_key: `tokens-2-${Date.now()}`,
          metadata: {
            input_tokens: 2000,
            cached_input_tokens: 1000,
            output_tokens: 400,
            reasoning_tokens: 100
          }
        });

      const summaryRes = await request(app)
        .get('/api/usage')
        .set('Authorization', `Bearer ${tokenApiKey}`);

      expect(summaryRes.status).toBe(200);
      const aiUsage = summaryRes.body.usage.ai_tokens;

      expect(aiUsage.used).toBe(5250);
      expect(aiUsage.breakdown.input_tokens).toBe(3000);
      expect(aiUsage.breakdown.cached_input_tokens).toBe(1500);
      expect(aiUsage.breakdown.output_tokens).toBe(600);
      expect(aiUsage.breakdown.reasoning_tokens).toBe(150);
    });
  });

  describe('5. Accurate Cost Calculation Without Rounding Down to Zero', () => {
    let smallUsageTenantId;
    let smallUsageApiKey;

    beforeAll(async () => {
      const tenantRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id) VALUES ('Small Usage Tenant', 'p2-test-small@example.com', $1) RETURNING id",
        [testPlanId]
      );
      smallUsageTenantId = tenantRes.rows[0].id;

      const keyRes = await request(app)
        .post(`/api/tenants/${smallUsageTenantId}/api-keys`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ name: 'Small Usage Key' });
      smallUsageApiKey = keyRes.body.data.api_key;
    });

    it('should accurately calculate costs for known token inputs', () => {
      // 1M input tokens at 30c/1M = 30c
      expect(calculateTokenCost('input_tokens', 1000000)).toBe(30);

      // 1M cached input tokens at 10c/1M = 10c
      expect(calculateTokenCost('cached_input_tokens', 1000000)).toBe(10);

      // 1M output tokens at 60c/1M = 60c
      expect(calculateTokenCost('output_tokens', 1000000)).toBe(60);

      // 1M reasoning tokens at 60c/1M = 60c
      expect(calculateTokenCost('reasoning_tokens', 1000000)).toBe(60);

      // Combined test: 1M input (30) + 1M cached (10) + 1M output (60) + 1M reasoning (60) = 160c ($1.60)
      const cost = calculateAITokenCost({
        input_tokens: 1000000,
        cached_input_tokens: 1000000,
        output_tokens: 1000000,
        reasoning_tokens: 1000000
      });
      expect(cost).toBe(160);
    });

    it('should not round small token usage down to zero when aggregated over the billing period', async () => {
      // Record 100 small calls of 100 input tokens each (total 10,000 input tokens)
      // 100 tokens at $0.30 per 1M = 0.003 cents each.
      // If rounded down individually, 100 * 0 = 0.
      // With aggregate accumulation: 10,000 tokens * 30 / 1,000,000 = 0.3 cents = 3,000 micro-cents!
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/usage')
          .set('Authorization', `Bearer ${smallUsageApiKey}`)
          .send({
            usage_type: 'ai_tokens',
            quantity: 500, // 20 * 500 = 10,000 tokens
            idempotency_key: `small-call-${i}-${Date.now()}`,
            metadata: { input_tokens: 500 }
          });
      }

      const summaryRes = await request(app)
        .get('/api/usage')
        .set('Authorization', `Bearer ${smallUsageApiKey}`);

      expect(summaryRes.status).toBe(200);
      const costs = summaryRes.body.costs;

      expect(summaryRes.body.usage.ai_tokens.used).toBe(10000);
      // Verify exact cost is preserved and not 0
      expect(costs.ai_tokens_cents_exact).toBeCloseTo(0.3, 4);
      expect(costs.ai_tokens_micro_cents).toBe(3000);
      expect(costs.total_dollars_exact).toBe('0.0030');
    });
  });

  describe('6. Deduplicated Usage Alerts per Tenant, Billing Period, and Metric Type', () => {
    let alertTenantId;
    let alertPlanId;

    beforeAll(async () => {
      // Create plan with limit 100 api calls and 1000 ai tokens
      const planRes = await pool.query(
        "INSERT INTO plans (name, api_calls_limit, ai_tokens_limit, allow_overage) VALUES ('P2 Alert Plan', 100, 1000, true) RETURNING id"
      );
      alertPlanId = planRes.rows[0].id;

      const tenantRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id) VALUES ('Alert Tenant', 'p2-test-alert@example.com', $1) RETURNING id",
        [alertPlanId]
      );
      alertTenantId = tenantRes.rows[0].id;
    });

    afterAll(async () => {
      await pool.query("DELETE FROM usage_alerts WHERE tenant_id = $1", [alertTenantId]);
      await pool.query("DELETE FROM usage_events WHERE tenant_id = $1", [alertTenantId]);
      await pool.query("DELETE FROM tenants WHERE id = $1", [alertTenantId]);
      await pool.query("DELETE FROM plans WHERE id = $1", [alertPlanId]);
    });

    it('should trigger and deduplicate alerts per metric type independently', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Cross 80% on api_call (85 / 100)
        await meterService.checkQuota(client, alertTenantId, 'api_call', 85);

        // 2. Subsequent api_call crosses 90% (85 + 5 = 90 / 100) -> should NOT create duplicate 80% alert
        await meterService.checkQuota(client, alertTenantId, 'api_call', 5);

        // 3. Cross 80% on ai_tokens (850 / 1000) -> SHOULD create 80% alert for ai_tokens
        await meterService.checkQuota(client, alertTenantId, 'ai_tokens', 850);

        await client.query('COMMIT');
      } finally {
        client.release();
      }

      // Check recorded alerts
      const alerts = await pool.query(
        'SELECT alert_type, metric_type FROM usage_alerts WHERE tenant_id = $1 ORDER BY metric_type, alert_type',
        [alertTenantId]
      );

      expect(alerts.rows.length).toBe(2);

      // Verify one alert for api_call and one alert for ai_tokens
      const apiAlert = alerts.rows.find(a => a.metric_type === 'api_call');
      const aiAlert = alerts.rows.find(a => a.metric_type === 'ai_tokens');

      expect(apiAlert).toBeDefined();
      expect(apiAlert.alert_type).toBe('80_percent');

      expect(aiAlert).toBeDefined();
      expect(aiAlert.alert_type).toBe('80_percent');
    });
  });
});
