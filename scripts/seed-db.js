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
    console.log('Connected to database');

    // Get Free plan ID
    const planResult = await client.query("SELECT id, ai_tokens_limit FROM plans WHERE name = 'Free'");
    if (planResult.rows.length === 0) {
      throw new Error('Free plan not found in database. Did you run schema.sql / npm run db:init?');
    }
    const freePlan = planResult.rows[0];
    
    // Create a demo tenant
    const tenantEmail = `demo-${Date.now()}@example.com`;
    console.log(`Creating demo tenant with email: ${tenantEmail}`);
    
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, email, plan_id) 
       VALUES ($1, $2, $3) RETURNING id`,
      ['Demo Company', tenantEmail, freePlan.id]
    );
    const tenantId = tenantResult.rows[0].id;
    console.log(`Demo tenant created with ID: ${tenantId}`);

    // Create an API key for the demo tenant
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const rawApiKey = `sk_live_${rawSecret}`;
    const prefix = rawApiKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    await client.query(
      `INSERT INTO api_keys (tenant_id, key_hash, prefix, name, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [tenantId, keyHash, prefix, 'Demo Default Key']
    );

    // Seed usage to put them near quota (e.g., 99,900 tokens used out of 100,000)
    const targetUsage = freePlan.ai_tokens_limit - 100;
    console.log(`Seeding usage to reach ${targetUsage} tokens (near quota limit of ${freePlan.ai_tokens_limit})...`);

    await client.query(
      `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        tenantId,
        'ai_tokens',
        targetUsage,
        'seed-idempotency-key-' + Date.now(),
        JSON.stringify({ note: 'seeded for demo prep' })
      ]
    );

    console.log('====================================================');
    console.log('Successfully seeded database for Demo Prep.');
    console.log(`Tenant ID:  ${tenantId}`);
    console.log(`API Key:    ${rawApiKey}`);
    console.log('Admin Key:  ' + (process.env.ADMIN_API_KEY || 'admin-secret-key'));
    console.log('====================================================');
    
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await client.end();
  }
}

seedDatabase();
