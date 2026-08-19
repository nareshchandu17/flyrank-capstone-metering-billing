const { Client } = require('pg');
require('dotenv').config();

// Default connection string if not in .env
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/usage_metering';

async function seedDatabase() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get Free plan ID
    const planResult = await client.query("SELECT id, ai_tokens_limit FROM plans WHERE name = 'Free'");
    if (planResult.rows.length === 0) {
      throw new Error('Free plan not found in database. Did you run schema.sql?');
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

    console.log('Successfully seeded database for Demo Prep.');
    console.log(`Tenant ID to use for API testing: ${tenantId}`);
    
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await client.end();
  }
}

seedDatabase();
