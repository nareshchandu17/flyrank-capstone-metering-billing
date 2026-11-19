require('dotenv').config({ path: '.env.test' });

// Ensure test environment variables are set
process.env.NODE_ENV = 'test';
process.env.AUTH0_DOMAIN = 'flyrank-test.us.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://api.flyrank.com';
process.env.AUTH0_ISSUER_BASE_URL = 'https://flyrank-test.us.auth0.com/';

const pool = require('../src/config/database');

beforeAll(async () => {
  // Test database connection check (if live Postgres is available)
  try {
    await pool.query('SELECT NOW()');
  } catch (err) {
    // If live docker postgres is offline, isolated tests use their own in-memory or mocked pool
  }
});

afterAll(async () => {
  try {
    await pool.end();
  } catch (err) {
    // ignore
  }
});
