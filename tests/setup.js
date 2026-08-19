require('dotenv').config({ path: '.env.test' });

// Test database setup
const pool = require('../src/config/database');

beforeAll(async () => {
  // Wait for database connection
  try {
    await pool.query('SELECT NOW()');
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
