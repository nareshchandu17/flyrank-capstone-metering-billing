const { Pool } = require('pg');
const fs = require('fs');
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

/**
 * Build PostgreSQL TLS/SSL configuration.
 * In production, certificate verification (rejectUnauthorized: true) is strictly enforced
 * and optional custom CA certificates can be supplied via DB_SSL_CA or DB_SSL_CA_PATH.
 */
function buildSslConfig(env = process.env) {
  const prod = env.NODE_ENV === 'production';
  const dbUrl = (env.DATABASE_URL || '').trim();
  const hasUrl = dbUrl.length > 0;
  const isLocalUrl = hasUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'));

  const useSsl = env.DB_SSL === 'true' || (hasUrl && !isLocalUrl);
  if (!useSsl) {
    return false;
  }

  if (prod && env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    throw new Error(
      'FATAL CONFIGURATION ERROR: Disabling PostgreSQL TLS certificate verification (DB_SSL_REJECT_UNAUTHORIZED=false) is forbidden in production.'
    );
  }

  let ca;
  if (env.DB_SSL_CA && env.DB_SSL_CA.trim()) {
    ca = env.DB_SSL_CA.replace(/\\n/g, '\n');
  } else if (env.DB_SSL_CA_PATH && env.DB_SSL_CA_PATH.trim()) {
    ca = fs.readFileSync(env.DB_SSL_CA_PATH.trim(), 'utf8');
  }

  const rejectUnauthorized = prod ? true : env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  return ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
}

const sslConfig = buildSslConfig(process.env);

const poolConfig = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: sslConfig,
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
      password: (process.env.DB_PASSWORD || '').trim(),
      ssl: sslConfig,
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

pool.buildSslConfig = buildSslConfig;

module.exports = pool;
