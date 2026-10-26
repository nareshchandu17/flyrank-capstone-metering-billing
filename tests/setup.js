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
