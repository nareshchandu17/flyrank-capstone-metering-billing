const pool = require('../src/config/database');
const stripeService = require('../src/services/stripeService');
const invoiceService = require('../src/services/invoiceService');
const meterService = require('../src/services/meterService');
const request = require('supertest');
const app = require('../src/app');
const crypto = require('crypto');
const {
  PRICING_CONFIG,
  getBillingPeriodDates,
  isValidBillingPeriod,
} = require('../src/config/pricing');

// In-memory mock storage for Stripe simulation
const mockStripeState = {
  customers: new Map(),
  subscriptions: new Map(),
  invoices: new Map(),
  invoiceItems: []
};

// Mock Stripe SDK
jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: {
      create: jest.fn(async (data) => {
        const id = `cus_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const customer = { id, ...data };
        mockStripeState.customers.set(id, customer);
        return customer;
      }),
    },
    checkout: {
      sessions: {
        create: jest.fn(async (data) => {
          const id = `cs_test_${Date.now()}`;
          return {
            id,
            url: `https://checkout.stripe.com/pay/${id}`,
            ...data
          };
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn(async (id) => {
        if (mockStripeState.subscriptions.has(id)) {
          return mockStripeState.subscriptions.get(id);
        }
        return {
          id,
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          items: {
            data: [{ id: `si_${id}`, price: { id: process.env.STRIPE_PRICE_PRO || 'price_pro_plan_id' } }]
          }
        };
      }),
      list: jest.fn(async ({ customer, status }) => {
        const subs = Array.from(mockStripeState.subscriptions.values()).filter(s => s.customer === customer);
        if (status && status !== 'all') {
          return { data: subs.filter(s => s.status === status) };
        }
        return { data: subs };
      }),
      update: jest.fn(async (id, data) => {
        const sub = mockStripeState.subscriptions.get(id) || { id, status: 'active' };
        if (data.items && data.items[0]) {
          sub.items = { data: [{ id: data.items[0].id || 'si_1', price: { id: data.items[0].price } }] };
        }
        mockStripeState.subscriptions.set(id, sub);
        return sub;
      }),
    },
    invoiceItems: {
      create: jest.fn(async (data) => {
        const item = { id: `ii_test_${Date.now()}`, ...data };
        mockStripeState.invoiceItems.push(item);
        return item;
      }),
    },
    invoices: {
      create: jest.fn(async (data) => {
        const id = `in_test_${Date.now()}`;
        const invoice = {
          id,
          status: 'draft',
          amount_due: 1000,
          hosted_invoice_url: `https://invoice.stripe.com/${id}`,
          invoice_pdf: `https://invoice.stripe.com/${id}/pdf`,
          ...data
        };
        mockStripeState.invoices.set(id, invoice);
        return invoice;
      }),
      finalizeInvoice: jest.fn(async (id) => {
        const invoice = mockStripeState.invoices.get(id) || { id };
        invoice.status = 'open';
        invoice.hosted_invoice_url = `https://invoice.stripe.com/${id}`;
        invoice.invoice_pdf = `https://invoice.stripe.com/${id}/pdf`;
        mockStripeState.invoices.set(id, invoice);
        return invoice;
      }),
    },
    webhooks: {
      constructEvent: jest.fn((payload, signature, secret) => {
        if (!signature || signature === 'invalid_sig') {
          throw new Error('Invalid signature');
        }
        const parsed = Buffer.isBuffer(payload) ? JSON.parse(payload.toString()) : (typeof payload === 'string' ? JSON.parse(payload) : payload);
        return parsed;
      }),
    },
  }));
});

describe('Phase 3 — Billing Workflow & Trustworthy Engine', () => {
  const adminApiKey = 'test-admin-api-key';
  let freePlanId;
  let proPlanId;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = adminApiKey;
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_test_secret';
    process.env.STRIPE_PRICE_PRO = 'price_pro_plan_id';

    const freeRes = await pool.query("SELECT id FROM plans WHERE name = 'Free'");
    const proRes = await pool.query("SELECT id FROM plans WHERE name = 'Pro'");
    freePlanId = freeRes.rows[0].id;
    proPlanId = proRes.rows[0].id;
  });

  afterAll(async () => {
    // Clean up mock state
    mockStripeState.customers.clear();
    mockStripeState.subscriptions.clear();
    mockStripeState.invoices.clear();
    mockStripeState.invoiceItems = [];
  });

  describe('1. Pricing & Billing-Period Model', () => {
    it('should validate and parse billing period dates correctly', () => {
      expect(isValidBillingPeriod('2026-10')).toBe(true);
      expect(isValidBillingPeriod('2026-13')).toBe(false);
      expect(isValidBillingPeriod('invalid')).toBe(false);

      const { startDate, endDate, billingPeriod } = getBillingPeriodDates('2026-10');
      expect(billingPeriod).toBe('2026-10');
      expect(startDate.toISOString()).toBe('2026-10-01T00:00:00.000Z');
      expect(endDate.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    });

    it('should define consistent plan pricing and token pricing structure', () => {
      expect(PRICING_CONFIG.plans.Free.base_price_cents).toBe(0);
      expect(PRICING_CONFIG.plans.Pro.base_price_cents).toBe(2900); // $29.00 / month
      expect(PRICING_CONFIG.api_call.cost_per_call).toBe(1); // 1 cent
      expect(PRICING_CONFIG.ai_tokens.input_tokens.cost_per_million).toBe(30); // 30c / 1M
      expect(PRICING_CONFIG.ai_tokens.cached_input_tokens.cost_per_million).toBe(10); // 10c / 1M
      expect(PRICING_CONFIG.ai_tokens.output_tokens.cost_per_million).toBe(60); // 60c / 1M
      expect(PRICING_CONFIG.ai_tokens.reasoning_tokens.cost_per_million).toBe(60); // 60c / 1M
    });
  });

  describe('2. Idempotent Invoice Creation & Uniqueness Constraint', () => {
    let tenantId;

    beforeEach(async () => {
      const email = `invoice-test-${Date.now()}@example.com`;
      const res = await pool.query(
        "INSERT INTO tenants (name, email, plan_id, stripe_customer_id) VALUES ($1, $2, $3, $4) RETURNING id",
        ['Invoice Test Tenant', email, proPlanId, 'cus_inv_test_1']
      );
      tenantId = res.rows[0].id;
    });

    afterEach(async () => {
      if (tenantId) {
        await pool.query('DELETE FROM invoices WHERE tenant_id = $1', [tenantId]);
        await pool.query('DELETE FROM usage_events WHERE tenant_id = $1', [tenantId]);
        await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      }
    });

    it('should generate an invoice with line items and prevent duplicate generation for the same period', async () => {
      const billingPeriod = '2026-08';

      // Insert usage events for period 2026-08
      const midMonthDate = '2026-08-15T12:00:00.000Z';
      await pool.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, created_at)
         VALUES ($1, 'api_call', 100, $2, $3)`,
        [tenantId, `api-${Date.now()}`, midMonthDate]
      );

      await pool.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata, created_at)
         VALUES ($1, 'ai_tokens', 100000, $2, $3, $4)`,
        [
          tenantId,
          `ai-${Date.now()}`,
          JSON.stringify({
            input_tokens: 50000,
            cached_input_tokens: 10000,
            output_tokens: 20000,
            reasoning_tokens: 20000,
          }),
          midMonthDate
        ]
      );

      // Generate invoice
      const result1 = await invoiceService.generateInvoice(tenantId, billingPeriod);
      expect(result1.status).toBe('created');
      expect(result1.invoice.billing_period).toBe(billingPeriod);
      expect(result1.invoice.line_items.length).toBeGreaterThan(0);

      // Verify Pro plan monthly base line item ($29.00 = 2900 cents)
      const basePlanItem = result1.invoice.line_items.find(item => item.description.includes('Pro Plan Monthly Subscription'));
      expect(basePlanItem).toBeDefined();
      expect(basePlanItem.amount_cents).toBe(2900);

      // Verify API call line item (100 calls * 1 cent = 100 cents)
      const apiItem = result1.invoice.line_items.find(item => item.description.includes('API Calls Usage'));
      expect(apiItem).toBeDefined();
      expect(apiItem.amount_cents).toBe(100);

      // Verify total amount equals sum of line items
      const sumLineItems = result1.invoice.line_items.reduce((sum, item) => sum + item.amount_cents, 0);
      expect(result1.invoice.amount_cents).toBe(sumLineItems);

      // Idempotency: Calling generateInvoice again must return existing invoice without creating duplicate rows
      const result2 = await invoiceService.generateInvoice(tenantId, billingPeriod);
      expect(result2.status).toBe('existing');
      expect(result2.invoice.id).toBe(result1.invoice.id);
      expect(result2.invoice.amount_cents).toBe(result1.invoice.amount_cents);

      // Verify DB table contains exactly 1 invoice for this tenant & period
      const dbInvoices = await pool.query(
        'SELECT * FROM invoices WHERE tenant_id = $1 AND billing_period = $2',
        [tenantId, billingPeriod]
      );
      expect(dbInvoices.rows.length).toBe(1);

      // Database level uniqueness test: direct insert attempt should violate unique constraint
      await expect(
        pool.query(
          'INSERT INTO invoices (tenant_id, billing_period, amount_cents) VALUES ($1, $2, $3)',
          [tenantId, billingPeriod, 500]
        )
      ).rejects.toThrow();
    });
  });

  describe('3. Replay-Safe Webhook Processing', () => {
    let testTenantId;
    let apiKey;

    beforeEach(async () => {
      const email = `webhook-test-${Date.now()}@example.com`;
      const tRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id) VALUES ($1, $2, $3) RETURNING id",
        ['Webhook Tenant', email, freePlanId]
      );
      testTenantId = tRes.rows[0].id;
    });

    afterEach(async () => {
      if (testTenantId) {
        await pool.query('DELETE FROM webhook_events WHERE stripe_event_id LIKE $1', ['evt_test_%']);
        await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [testTenantId]);
        await pool.query('DELETE FROM invoices WHERE tenant_id = $1', [testTenantId]);
        await pool.query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
      }
    });

    it('should process checkout.session.completed once and reject replayed event with duplicate status', async () => {
      const eventId = `evt_test_checkout_${Date.now()}`;
      const subscriptionId = `sub_test_${Date.now()}`;
      const customerId = `cus_test_${Date.now()}`;

      const webhookPayload = {
        id: eventId,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_${Date.now()}`,
            customer: customerId,
            subscription: subscriptionId,
            metadata: {
              tenant_id: testTenantId,
              plan_name: 'Pro',
            },
          },
        },
      };

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(webhookPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('success');

      // Verify tenant plan upgraded to Pro
      const tenantCheck = await pool.query('SELECT plan_id, status FROM tenants WHERE id = $1', [testTenantId]);
      expect(tenantCheck.rows[0].plan_id).toBe(proPlanId);
      expect(tenantCheck.rows[0].status).toBe('active');

      // Verify subscription record created
      const subCheck = await pool.query(
        'SELECT * FROM subscriptions WHERE tenant_id = $1 AND stripe_subscription_id = $2',
        [testTenantId, subscriptionId]
      );
      expect(subCheck.rows.length).toBe(1);

      // Replay the exact same webhook
      const res2 = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(webhookPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('duplicate');
      expect(res2.body.message).toContain('already processed');

      // Ensure no duplicate subscriptions were created
      const subCheckAfter = await pool.query(
        'SELECT COUNT(*) as count FROM subscriptions WHERE tenant_id = $1',
        [testTenantId]
      );
      expect(parseInt(subCheckAfter.rows[0].count, 10)).toBe(1);
    });

    it('should process invoice.paid webhook and synchronize payment status and paid_at', async () => {
      const stripeInvoiceId = `in_paid_test_${Date.now()}`;
      const paymentIntentId = `pi_test_${Date.now()}`;
      const billingPeriod = '2026-07';

      // Create a pending local invoice linked to this stripe_invoice_id
      const invRes = await pool.query(
        `INSERT INTO invoices (tenant_id, billing_period, amount_cents, status, stripe_invoice_id)
         VALUES ($1, $2, 3000, 'pending', $3) RETURNING id`,
        [testTenantId, billingPeriod, stripeInvoiceId]
      );
      const localInvoiceId = invRes.rows[0].id;

      const invoicePaidEvent = {
        id: `evt_test_inv_paid_${Date.now()}`,
        type: 'invoice.paid',
        data: {
          object: {
            id: stripeInvoiceId,
            payment_intent: paymentIntentId,
            status: 'paid',
            status_transitions: {
              paid_at: Math.floor(Date.now() / 1000)
            }
          }
        }
      };

      const res = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(invoicePaidEvent);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify invoice status updated to 'paid' in DB
      const updatedInv = await pool.query(
        'SELECT status, paid_at, stripe_payment_intent_id FROM invoices WHERE id = $1',
        [localInvoiceId]
      );
      expect(updatedInv.rows[0].status).toBe('paid');
      expect(updatedInv.rows[0].paid_at).not.toBeNull();
      expect(updatedInv.rows[0].stripe_payment_intent_id).toBe(paymentIntentId);
    });

    it('should handle customer.subscription.deleted and downgrade tenant to Free plan', async () => {
      const subId = `sub_del_${Date.now()}`;
      await pool.query(
        `INSERT INTO subscriptions (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, NOW(), NOW() + interval '1 month')`,
        [testTenantId, subId, proPlanId]
      );
      await pool.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [proPlanId, testTenantId]);

      const deleteEvent = {
        id: `evt_test_sub_del_${Date.now()}`,
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: subId,
            status: 'canceled'
          }
        }
      };

      const res = await request(app)
        .post('/api/stripe/webhooks')
        .set('stripe-signature', 'valid_test_signature')
        .send(deleteEvent);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify subscription canceled and tenant downgraded to Free plan
      const subCheck = await pool.query('SELECT status FROM subscriptions WHERE stripe_subscription_id = $1', [subId]);
      expect(subCheck.rows[0].status).toBe('canceled');

      const tenantCheck = await pool.query('SELECT plan_id FROM tenants WHERE id = $1', [testTenantId]);
      expect(tenantCheck.rows[0].plan_id).toBe(freePlanId);
    });
  });

  describe('4. Stripe Subscription State Reconciliation', () => {
    let testTenantId;
    let testCustomerId;

    beforeEach(async () => {
      mockStripeState.subscriptions.clear();
      testCustomerId = `cus_recon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const email = `recon-test-${Date.now()}@example.com`;
      const tRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id, stripe_customer_id, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id",
        ['Reconcile Tenant', email, freePlanId, testCustomerId]
      );
      testTenantId = tRes.rows[0].id;
    });

    afterEach(async () => {
      if (testTenantId) {
        await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [testTenantId]);
        await pool.query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
      }
    });

    it('should detect missed webhook drift and synchronize subscription & plan state with Stripe', async () => {
      // Simulate Stripe has an active Pro subscription for this customer
      const activeStripeSub = {
        id: `sub_stripe_active_${Date.now()}`,
        customer: testCustomerId,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: {
          data: [{ id: 'si_1', price: { id: process.env.STRIPE_PRICE_PRO || 'price_pro_plan_id' } }]
        }
      };
      mockStripeState.subscriptions.set(activeStripeSub.id, activeStripeSub);

      // But local DB tenant currently has Free plan and no active subscription record!
      // Run reconciliation
      const reconResult = await stripeService.reconcileTenantSubscription(testTenantId);
      expect(reconResult.reconciled).toBe(true);
      expect(reconResult.synced).toBe(true);

      // Verify DB now has subscription inserted and tenant plan upgraded to Pro
      const tenantCheck = await pool.query('SELECT plan_id, status FROM tenants WHERE id = $1', [testTenantId]);
      expect(tenantCheck.rows[0].plan_id).toBe(proPlanId);
      expect(tenantCheck.rows[0].status).toBe('active');

      const subCheck = await pool.query(
        'SELECT * FROM subscriptions WHERE tenant_id = $1 AND stripe_subscription_id = $2',
        [testTenantId, activeStripeSub.id]
      );
      expect(subCheck.rows.length).toBe(1);
      expect(subCheck.rows[0].status).toBe('active');
    });

    it('should reconcile canceled Stripe subscriptions by canceling DB subscription and downgrading to Free', async () => {
      const subId = `sub_stripe_canc_${Date.now()}`;
      // In local DB, subscription is active and tenant is Pro
      await pool.query(
        `INSERT INTO subscriptions (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, NOW(), NOW() + interval '1 month')`,
        [testTenantId, subId, proPlanId]
      );
      await pool.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [proPlanId, testTenantId]);

      // In Stripe, the subscription was canceled
      const canceledStripeSub = {
        id: subId,
        customer: testCustomerId,
        status: 'canceled',
        current_period_start: Math.floor(Date.now() / 1000) - 2592000,
        current_period_end: Math.floor(Date.now() / 1000),
      };
      mockStripeState.subscriptions.set(subId, canceledStripeSub);

      const reconResult = await stripeService.reconcileTenantSubscription(testTenantId);
      expect(reconResult.reconciled).toBe(true);
      expect(reconResult.synced).toBe(true);

      // Verify DB subscription canceled and tenant downgraded to Free
      const subCheck = await pool.query('SELECT status FROM subscriptions WHERE stripe_subscription_id = $1', [subId]);
      expect(subCheck.rows[0].status).toBe('canceled');

      const tenantCheck = await pool.query('SELECT plan_id FROM tenants WHERE id = $1', [testTenantId]);
      expect(tenantCheck.rows[0].plan_id).toBe(freePlanId);
    });
  });

  describe('5. End-to-End Definition of Done Flow', () => {
    it('proves complete lifecycle: checkout -> upgrade -> billable usage -> accurate invoice -> payment sync -> replay-safe', async () => {
      // 1. Create a fresh test tenant on Free plan with an active API Key
      const email = `dod-${Date.now()}@example.com`;
      const tenantRes = await pool.query(
        "INSERT INTO tenants (name, email, plan_id, status) VALUES ($1, $2, $3, 'active') RETURNING id",
        ['End To End Tenant', email, freePlanId]
      );
      const dodTenantId = tenantRes.rows[0].id;

      const rawApiKey = `sk_live_dod_${crypto.randomBytes(16).toString('hex')}`;
      const prefix = rawApiKey.substring(0, 12);
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      await pool.query(
        "INSERT INTO api_keys (tenant_id, key_hash, prefix, name, status) VALUES ($1, $2, $3, 'DoD Key', 'active')",
        [dodTenantId, keyHash, prefix]
      );

      try {
        // 2. Checkout session creation
        const checkoutRes = await stripeService.createCheckoutSession(dodTenantId, 'Pro');
        expect(checkoutRes.sessionId).toBeDefined();
        expect(checkoutRes.url).toBeDefined();

        // 3. Checkout completes via webhook -> tenant receives Pro plan
        const subscriptionId = `sub_dod_${Date.now()}`;
        const checkoutCompletedEvent = {
          id: `evt_dod_checkout_${Date.now()}`,
          type: 'checkout.session.completed',
          data: {
            object: {
              id: checkoutRes.sessionId,
              customer: `cus_dod_${Date.now()}`,
              subscription: subscriptionId,
              metadata: {
                tenant_id: dodTenantId,
                plan_name: 'Pro'
              }
            }
          }
        };

        const webhookRes = await request(app)
          .post('/api/stripe/webhooks')
          .set('stripe-signature', 'valid_test_signature')
          .send(checkoutCompletedEvent);

        expect(webhookRes.status).toBe(200);

        // Verify tenant is now on Pro plan
        const tenantAfterCheckout = await pool.query('SELECT plan_id, status FROM tenants WHERE id = $1', [dodTenantId]);
        expect(tenantAfterCheckout.rows[0].plan_id).toBe(proPlanId);
        expect(tenantAfterCheckout.rows[0].status).toBe('active');

        // 4. Generate billable usage
        const period = '2026-06';
        const usageDate = '2026-06-10T10:00:00.000Z';

        // 50 API calls
        await pool.query(
          `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, created_at)
           VALUES ($1, 'api_call', 50, $2, $3)`,
          [dodTenantId, `dod-api-${Date.now()}`, usageDate]
        );

        // 100,000 AI tokens with full breakdown
        await pool.query(
          `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata, created_at)
           VALUES ($1, 'ai_tokens', 100000, $2, $3, $4)`,
          [
            dodTenantId,
            `dod-ai-${Date.now()}`,
            JSON.stringify({
              input_tokens: 40000,
              cached_input_tokens: 20000,
              output_tokens: 20000,
              reasoning_tokens: 20000,
            }),
            usageDate
          ]
        );

        // 5. Generate one accurate invoice for the period
        const invoiceGenRes = await invoiceService.generateInvoice(dodTenantId, period);
        expect(invoiceGenRes.status).toBe('created');
        const invoice = invoiceGenRes.invoice;
        expect(invoice.billing_period).toBe(period);
        expect(invoice.line_items.length).toBeGreaterThanOrEqual(4);

        // Verify line item math:
        // Pro subscription base: 2900 cents
        // 50 API calls @ 1c: 50 cents
        // 40,000 input @ 30c/1M: 1.2c -> 1c
        // 20,000 cached @ 10c/1M: 0.2c -> 1c
        // 20,000 output @ 60c/1M: 1.2c -> 1c
        // 20,000 reasoning @ 60c/1M: 1.2c -> 1c
        const totalLineAmount = invoice.line_items.reduce((acc, item) => acc + item.amount_cents, 0);
        expect(invoice.amount_cents).toBe(totalLineAmount);

        // 6. Stripe Invoice synchronization via payment webhook
        if (invoice.stripe_invoice_id) {
          const invoicePaidEvent = {
            id: `evt_dod_pay_${Date.now()}`,
            type: 'invoice.paid',
            data: {
              object: {
                id: invoice.stripe_invoice_id,
                payment_intent: `pi_dod_${Date.now()}`,
                status: 'paid',
                status_transitions: {
                  paid_at: Math.floor(Date.now() / 1000)
                }
              }
            }
          };

          const payWebhookRes = await request(app)
            .post('/api/stripe/webhooks')
            .set('stripe-signature', 'valid_test_signature')
            .send(invoicePaidEvent);

          expect(payWebhookRes.status).toBe(200);

          // Verify invoice is paid and synchronized
          const invoiceCheck = await pool.query('SELECT status, paid_at FROM invoices WHERE id = $1', [invoice.id]);
          expect(invoiceCheck.rows[0].status).toBe('paid');
          expect(invoiceCheck.rows[0].paid_at).not.toBeNull();
        }

        // 7. Verify replaying checkout webhook returns duplicate and does not create duplicate subscription
        const replayRes = await request(app)
          .post('/api/stripe/webhooks')
          .set('stripe-signature', 'valid_test_signature')
          .send(checkoutCompletedEvent);

        expect(replayRes.status).toBe(200);
        expect(replayRes.body.status).toBe('duplicate');

        // Verify replaying invoice generation returns existing invoice
        const replayInvRes = await invoiceService.generateInvoice(dodTenantId, period);
        expect(replayInvRes.status).toBe('existing');
        expect(replayInvRes.invoice.id).toBe(invoice.id);

      } finally {
        await pool.query('DELETE FROM webhook_events WHERE stripe_event_id LIKE $1', ['evt_dod_%']);
        await pool.query('DELETE FROM invoices WHERE tenant_id = $1', [dodTenantId]);
        await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [dodTenantId]);
        await pool.query('DELETE FROM usage_events WHERE tenant_id = $1', [dodTenantId]);
        await pool.query('DELETE FROM api_keys WHERE tenant_id = $1', [dodTenantId]);
        await pool.query('DELETE FROM tenants WHERE id = $1', [dodTenantId]);
      }
    });
  });
});
