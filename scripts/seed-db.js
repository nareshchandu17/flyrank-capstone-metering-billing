const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

// Default connection configuration
const clientConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'usage_metering',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    };

async function seedDatabase() {
  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database for demo seeding...');

    // 1. Ensure Plans exist
    await client.query(`
      INSERT INTO plans (name, api_calls_limit, ai_tokens_limit, allow_overage)
      VALUES 
        ('Free', 1000, 100000, false),
        ('Pro', 100000, 50000000, true),
        ('Enterprise', 1000000, 500000000, true)
      ON CONFLICT (name) DO UPDATE 
      SET api_calls_limit = EXCLUDED.api_calls_limit,
          ai_tokens_limit = EXCLUDED.ai_tokens_limit,
          allow_overage = EXCLUDED.allow_overage;
    `);

    const freePlanRes = await client.query("SELECT id, ai_tokens_limit, api_calls_limit FROM plans WHERE name = 'Free'");
    const proPlanRes = await client.query("SELECT id, ai_tokens_limit, api_calls_limit FROM plans WHERE name = 'Pro'");
    const freePlan = freePlanRes.rows[0];
    const proPlan = proPlanRes.rows[0];

    // 2. Seed Tenant 1: Acme AI Technologies (Pro Plan)
    const acmeEmail = 'acme-demo@example.com';
    let acmeTenant = await client.query("SELECT id FROM tenants WHERE email = $1", [acmeEmail]);
    let acmeTenantId;

    if (acmeTenant.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO tenants (name, email, plan_id, stripe_customer_id, status)
         VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
        ['Acme AI Technologies', acmeEmail, proPlan.id, 'cus_demo_acme_prod']
      );
      acmeTenantId = res.rows[0].id;
    } else {
      acmeTenantId = acmeTenant.rows[0].id;
      await client.query("UPDATE tenants SET plan_id = $1, status = 'active' WHERE id = $2", [proPlan.id, acmeTenantId]);
    }

    // 3. Seed Acme API Key
    const acmeApiKey = 'sk_live_demo_acme_tech_key_001';
    const acmeKeyPrefix = acmeApiKey.substring(0, 12);
    const acmeKeyHash = crypto.createHash('sha256').update(acmeApiKey).digest('hex');

    await client.query(
      `INSERT INTO api_keys (tenant_id, key_hash, prefix, name, status)
       VALUES ($1, $2, $3, 'Acme Primary Production Key', 'active')
       ON CONFLICT (key_hash) DO NOTHING`,
      [acmeTenantId, acmeKeyHash, acmeKeyPrefix]
    );

    // 4. Seed Acme Subscriptions
    await client.query(
      `INSERT INTO subscriptions (tenant_id, stripe_subscription_id, status, plan_id, current_period_start, current_period_end)
       VALUES ($1, 'sub_demo_acme_pro_active', 'active', $2, NOW() - interval '15 days', NOW() + interval '15 days')
       ON CONFLICT (tenant_id, stripe_subscription_id) DO UPDATE SET status = 'active'`,
      [acmeTenantId, proPlan.id]
    );

    // 5. Seed Acme Usage Events (API calls and rich AI tokens across 24h)
    const baseDate = new Date();
    const acmeEvents = [
      { type: 'api_call', qty: 250, hoursAgo: 20, meta: null },
      { type: 'api_call', qty: 480, hoursAgo: 16, meta: null },
      { type: 'api_call', qty: 620, hoursAgo: 12, meta: null },
      { type: 'api_call', qty: 310, hoursAgo: 8, meta: null },
      { type: 'api_call', qty: 150, hoursAgo: 2, meta: null },
      { 
        type: 'ai_tokens', 
        qty: 125000, 
        hoursAgo: 18, 
        meta: { input_tokens: 80000, cached_input_tokens: 20000, output_tokens: 15000, reasoning_tokens: 10000 } 
      },
      { 
        type: 'ai_tokens', 
        qty: 350000, 
        hoursAgo: 10, 
        meta: { input_tokens: 200000, cached_input_tokens: 50000, output_tokens: 60000, reasoning_tokens: 40000 } 
      },
      { 
        type: 'ai_tokens', 
        qty: 75000, 
        hoursAgo: 4, 
        meta: { input_tokens: 45000, cached_input_tokens: 10000, output_tokens: 12000, reasoning_tokens: 8000 } 
      }
    ];

    for (let i = 0; i < acmeEvents.length; i++) {
      const ev = acmeEvents[i];
      const evDate = new Date(baseDate.getTime() - ev.hoursAgo * 3600 * 1000);
      const idemKey = `demo-acme-seed-event-${i}-${ev.type}`;

      await client.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
        [acmeTenantId, ev.type, ev.qty, idemKey, ev.meta ? JSON.stringify(ev.meta) : null, evDate]
      );
    }

    // 6. Seed Acme Invoices (Previous month Paid, Current month Open)
    const now = new Date();
    const prevYearMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);
    const currYearMonth = now.toISOString().substring(0, 7);

    // Paid previous invoice
    await client.query(
      `INSERT INTO invoices (
        tenant_id, billing_period, amount_cents, status, 
        stripe_invoice_id, stripe_payment_intent_id, hosted_invoice_url, paid_at
      ) VALUES ($1, $2, 4250, 'paid', 'in_demo_acme_prev_paid', 'pi_demo_acme_paid', 'https://invoice.stripe.com/demo_paid', NOW() - interval '20 days')
      ON CONFLICT (tenant_id, billing_period) DO NOTHING`,
      [acmeTenantId, prevYearMonth]
    );

    // Open current month invoice
    await client.query(
      `INSERT INTO invoices (
        tenant_id, billing_period, amount_cents, status, 
        stripe_invoice_id, hosted_invoice_url
      ) VALUES ($1, $2, 3420, 'pending', 'in_demo_acme_curr_open', 'https://invoice.stripe.com/demo_pending')
      ON CONFLICT (tenant_id, billing_period) DO NOTHING`,
      [acmeTenantId, currYearMonth]
    );

    // 7. Seed Tenant 2: Startup Studio (Free Plan - Near Quota boundary for Alert Testing)
    const startupEmail = 'startup-studio-demo@example.com';
    let startupTenant = await client.query("SELECT id FROM tenants WHERE email = $1", [startupEmail]);
    let startupTenantId;

    if (startupTenant.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO tenants (name, email, plan_id, status)
         VALUES ($1, $2, $3, 'active') RETURNING id`,
        ['Startup Studio', startupEmail, freePlan.id]
      );
      startupTenantId = res.rows[0].id;
    } else {
      startupTenantId = startupTenant.rows[0].id;
      await client.query("UPDATE tenants SET plan_id = $1, status = 'active' WHERE id = $2", [freePlan.id, startupTenantId]);
    }

    // Startup API Key
    const startupApiKey = 'sk_live_demo_startup_studio_002';
    const startupKeyPrefix = startupApiKey.substring(0, 12);
    const startupKeyHash = crypto.createHash('sha256').update(startupApiKey).digest('hex');

    await client.query(
      `INSERT INTO api_keys (tenant_id, key_hash, prefix, name, status)
       VALUES ($1, $2, $3, 'Startup Studio Dev Key', 'active')
       ON CONFLICT (key_hash) DO NOTHING`,
      [startupTenantId, startupKeyHash, startupKeyPrefix]
    );

    // Seed usage right at 85% of Free Quota (85,000 out of 100,000 tokens)
    const targetUsage = Math.round(freePlan.ai_tokens_limit * 0.85);
    await client.query(
      `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata, created_at)
       VALUES ($1, 'ai_tokens', $2, 'seed-startup-tokens-85pct', $3, NOW() - interval '2 hours')
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
      [
        startupTenantId, 
        targetUsage, 
        JSON.stringify({ 
          input_tokens: Math.round(targetUsage * 0.7), 
          cached_input_tokens: Math.round(targetUsage * 0.1), 
          output_tokens: Math.round(targetUsage * 0.15), 
          reasoning_tokens: Math.round(targetUsage * 0.05) 
        })
      ]
    );

    // Seed deduplicated quota warning alert for Startup Studio
    await client.query(
      `INSERT INTO usage_alerts (tenant_id, alert_type, billing_period, metric_type)
       VALUES ($1, '80_percent', $2, 'ai_tokens')
       ON CONFLICT (tenant_id, alert_type, billing_period, metric_type) DO NOTHING`,
      [startupTenantId, currYearMonth]
    );

    console.log('\n================================================================');
    console.log('🎉 REPRODUCIBLE DEMO ENVIRONMENT SUCCESSFULLY SEEDED');
    console.log('================================================================');
    console.log(`[Admin Access]`);
    console.log(`  Admin Secret Key : ${process.env.ADMIN_API_KEY || 'admin-secret-key'}`);
    console.log(`\n[Tenant 1: Acme AI Technologies (Pro Plan)]`);
    console.log(`  Tenant ID        : ${acmeTenantId}`);
    console.log(`  Email            : ${acmeEmail}`);
    console.log(`  API Key          : ${acmeApiKey}`);
    console.log(`  Stripe Customer  : cus_demo_acme_prod`);
    console.log(`  Status           : Active, with 8 usage events and 2 invoices (1 Paid, 1 Pending)`);
    console.log(`\n[Tenant 2: Startup Studio (Free Plan - Quota Alert Demo)]`);
    console.log(`  Tenant ID        : ${startupTenantId}`);
    console.log(`  Email            : ${startupEmail}`);
    console.log(`  API Key          : ${startupApiKey}`);
    console.log(`  Status           : 85,000 / 100,000 tokens used (80% Warning Alert triggered)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
