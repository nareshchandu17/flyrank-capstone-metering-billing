require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function waitForConnection(clientConfig, maxAttempts = 30) {
  let attempts = 0;
  console.log('Waiting for PostgreSQL to be ready...');

  while (attempts < maxAttempts) {
    const client = new Client(clientConfig);
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('PostgreSQL is ready and accepting connections');
      return true;
    } catch (err) {
      attempts++;
      console.log(`Waiting for PostgreSQL (${err.message}) - attempt ${attempts}/${maxAttempts}`);
      try { await client.end(); } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('PostgreSQL did not become ready in time');
}

async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const clientConfig = connectionString 
    ? { connectionString }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'usage_metering',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      };

  try {
    await waitForConnection(clientConfig);

    console.log('Applying database schema from schema.sql...');
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const client = new Client(clientConfig);
    await client.connect();
    await client.query(schemaSql);
    await client.end();

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
