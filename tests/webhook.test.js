const stripeService = require('../src/services/stripeService');
const pool = require('../src/config/database');
const request = require('supertest');
const app = require('../src/app');

// Mock Stripe for testing
jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn((payload, signature, secret) => {
        if (!signature || signature === 'invalid_sig' || signature === 't=123,v1=bad_signature') {
          throw new Error('Invalid signature');
        }
        const parsed = Buffer.isBuffer(payload) ? JSON.parse(payload.toString()) : (typeof payload === 'string' ? JSON.parse(payload) : payload);
        return parsed;
      })
    },
    customers: {
      create: jest.fn()
    },
    checkout: {
      sessions: {
        create: jest.fn()
      }
    },
    subscriptions: {
      retrieve: jest.fn(async (id) => ({
        id,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: {
          data: [{ id: 'si_1', price: { id: process.env.STRIPE_PRICE_PRO || 'price_pro_plan_id' } }]
        }
      }))
    }
  }));
});

describe('Stripe Webhook Handling', () => {
  let testTenantId;
  let testPlanId;
  let proPlanId;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

    // Ensure plans exist
    const planResult = await pool.query(
      'INSERT INTO plans (name, api_calls_limit, ai_tokens_limit) VALUES ($1, $2, $3) RETURNING id',
      ['Webhook Test Plan', 100, 1000]
    );
    testPlanId = planResult.rows[0].id;

    const proRes = await pool.query("SELECT id FROM plans WHERE name = 'Pro'");
    proPlanId = proRes.rows[0].id;

    // Create test tenant
    const tenantResult = await pool.query(
      'INSERT INTO tenants (name, email, plan_id, stripe_customer_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Webhook Test Tenant', `webhook-${Date.now()}@example.com`, testPlanId, 'cus_test123']
    );
    testTenantId = tenantResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM webhook_events WHERE stripe_event_id LIKE $1', ['evt_test_%']);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [testTenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
    await pool.query('DELETE FROM plans WHERE name = $1', ['Webhook Test Plan']);
  });

  describe('1. Webhook Signature Verification', () => {
    it('should reject webhook requests missing stripe-signature header with 400', async () => {
      const res = await request(app)
        .post('/api/stripe/webhooks')
        .send({
          id: `evt_test_nosig_${Date.now()}`,
          type: 'checkout.session.completed',
          data: { object: {} }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing stripe-signature header');
    });

    it('should reject webhook requests with invalid signatures with 400', async () => {
      const res = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'invalid_sig')
        .send({
          id: `evt_test_invalidsig_${Date.now()}`,
          type: 'checkout.session.completed',
          data: { object: {} }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid signature');
    });

    it('should accept webhook requests with valid signatures and process them', async () => {
      const eventId = `evt_test_validsig_${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_test_${Date.now()}`,
            customer: 'cus_test123',
            subscription: `sub_validsig_${Date.now()}`,
            metadata: {
              tenant_id: testTenantId,
              plan_name: 'Pro'
            }
          }
        }
      };

      const res = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_signature')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify event was saved to webhook_events for replay defense
      const eventCheck = await pool.query(
        'SELECT * FROM webhook_events WHERE stripe_event_id = $1',
        [eventId]
      );
      expect(eventCheck.rows.length).toBe(1);
      expect(eventCheck.rows[0].event_type).toBe('checkout.session.completed');
    });
  });

  describe('2. Replayed Events & Duplicate Prevention', () => {
    it('should reject replayed webhook events with duplicate status', async () => {
      const eventId = `evt_test_replay_${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: `sub_replay_${Date.now()}`,
            customer: 'cus_test123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000
          }
        }
      };

      // First time: processed
      const res1 = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_signature')
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('success');

      // Second time (replay of same event ID): detected as duplicate
      const res2 = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_signature')
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('duplicate');
      expect(res2.body.message).toContain('already processed');
    });

    it('should prevent duplicate checkout.session.completed events at the subscription level', async () => {
      const subId = `sub_duplicate_test_${Date.now()}`;
      // Create a subscription that already exists
      await pool.query(
        `INSERT INTO subscriptions 
         (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))`,
        [testTenantId, subId, 'active', testPlanId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 2592000]
      );
      
      const mockSession = {
        subscription: subId,
        metadata: {
          tenant_id: testTenantId,
          plan_name: 'Pro'
        }
      };
      
      const result = await stripeService.handleCheckoutSessionCompleted(mockSession);
      
      expect(result.status).toBe('duplicate');
      expect(result.message).toBe('Subscription already processed');
    });
  });
});
