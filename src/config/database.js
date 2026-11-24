const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

// In production, reject unconfigured database credentials — never silently fall back to localhost defaults
if (isProduction && !hasDatabaseUrl && (!process.env.DB_HOST || !process.env.DB_PASSWORD)) {
  const errMsg = 'FATAL CONFIGURATION ERROR: Missing required database configuration in production. Set DATABASE_URL or explicit (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).';
  console.error('\n' + '='.repeat(80));
  console.error(errMsg);
  console.error('='.repeat(80) + '\n');
  throw new Error(errMsg);
}

// Determine SSL requirements: enabled if DB_SSL=true or if production cloud database (e.g. Supabase, RDS, Neon)
const useSsl = process.env.DB_SSL === 'true' || 
  (hasDatabaseUrl && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));

const poolConfig = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    }
  : {
      host: (process.env.DB_HOST || 'localhost').trim(),
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: (process.env.DB_NAME || 'usage_metering').trim(),
      user: (process.env.DB_USER || 'postgres').trim(),
      password: (process.env.DB_PASSWORD || 'password').trim(),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  // Connection acquired
});

// Production resilience: NEVER call process.exit() on idle client errors.
// Transient network resets in managed clouds should not terminate the application process.
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Unexpected error on idle client:', err.message);
});

module.exports = pool;
