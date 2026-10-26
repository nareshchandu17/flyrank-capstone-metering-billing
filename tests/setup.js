require('dotenv').config({ path: '.env.test' });

if (!process.env.ADMIN_API_KEY) {
  process.env.ADMIN_API_KEY = 'test-admin-api-key';
}

// Test database setup
const pool = require('../src/config/database');

beforeAll(async () => {
  // Wait for database connection and ensure test schema is updated
  try {
    await pool.query('SELECT NOW()');
    await pool.query(`
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_overage BOOLEAN DEFAULT false;
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
      ALTER TABLE usage_alerts ADD COLUMN IF NOT EXISTS metric_type VARCHAR(50) NOT NULL DEFAULT 'api_call';
      DO $$ 
      BEGIN
          IF EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'usage_alerts_tenant_id_alert_type_billing_period_key'
          ) THEN
              ALTER TABLE usage_alerts DROP CONSTRAINT usage_alerts_tenant_id_alert_type_billing_period_key;
          END IF;
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'usage_alerts_tenant_alert_period_metric_key'
          ) THEN
              ALTER TABLE usage_alerts ADD CONSTRAINT usage_alerts_tenant_alert_period_metric_key UNIQUE(tenant_id, alert_type, billing_period, metric_type);
          END IF;
      END $$;
    `);
    console.log('Test database connected');
  } catch (error) {
    console.error('Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Close database connection
  await pool.end();
});
