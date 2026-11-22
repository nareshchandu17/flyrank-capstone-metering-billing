require('dotenv').config();

// Validate critical Auth0 configuration during production startup
if (process.env.NODE_ENV === 'production') {
  const missing = [];
  if (!process.env.AUTH0_DOMAIN && !process.env.AUTH0_ISSUER_BASE_URL) missing.push('AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL');
  if (!process.env.AUTH0_AUDIENCE) missing.push('AUTH0_AUDIENCE');
  if (missing.length > 0) {
    console.error('\n' + '='.repeat(70));
    console.error(`FATAL CONFIGURATION ERROR: Missing required Auth0 settings in production: ${missing.join(', ')}`);
    console.error('The server refuses to start without verified Auth0 identity configuration.');
    console.error('='.repeat(70) + '\n');
    throw new Error(`Auth0 configuration missing in production: ${missing.join(', ')}`);
  }
}

const app = require('./app');
const pool = require('./config/database');
const invoiceJob = require('./jobs/invoiceJob');
const reconcileJob = require('./jobs/reconcileJob');
const stripeService = require('./services/stripeService');

const PORT = process.env.PORT || 3000;

// Database initialization
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('Database connection established');

    // Ensure critical columns and tables exist for RBAC and metering
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_overage BOOLEAN DEFAULT false;
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
      ALTER TABLE usage_alerts ADD COLUMN IF NOT EXISTS metric_type VARCHAR(50) NOT NULL DEFAULT 'api_call';
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hosted_invoice_url TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_pdf TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

      CREATE TABLE IF NOT EXISTS webhook_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'received',
          attempts INTEGER DEFAULT 1,
          error_message TEXT,
          processed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS error_message TEXT;
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);

      -- RBAC Tables
      CREATE TABLE IF NOT EXISTS app_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          auth0_sub VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          picture TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platform_admins (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          granted_by VARCHAR(255) DEFAULT 'system',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
      );

      CREATE TABLE IF NOT EXISTS tenant_memberships (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL CHECK (role IN ('Tenant Owner', 'Billing Manager', 'Developer', 'Viewer')),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tenant_invitations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('Tenant Owner', 'Billing Manager', 'Developer', 'Viewer')),
          token VARCHAR(255) UNIQUE NOT NULL,
          invited_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
          expires_at TIMESTAMP NOT NULL,
          accepted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
          user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
          actor_sub VARCHAR(255) NOT NULL,
          actor_email VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          resource_id VARCHAR(255),
          metadata JSONB DEFAULT '{}'::jsonb,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_app_users_auth0_sub ON app_users(auth0_sub);
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_created_type ON usage_events(tenant_id, created_at, usage_type);

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
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'invoices_tenant_billing_period_key'
          ) THEN
              ALTER TABLE invoices ADD CONSTRAINT invoices_tenant_billing_period_key UNIQUE(tenant_id, billing_period);
          END IF;
      END $$;
    `);

    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

let server;

// Start server
async function startServer() {
  await initializeDatabase();

    server = app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('🚀 Usage Metering & Billing Engine - Backend Server');
      console.log('='.repeat(60));
      console.log(`✅ Backend API running on port ${PORT}`);
      console.log(`📡 API Endpoint: http://localhost:${PORT}`);
      console.log(`🎨 Frontend UI: http://localhost:5173`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 Identity: Auth0 JWT verification active`);

      if (stripeService.isConfigured()) {
        stripeService.validateStripeConfig().then(() => {
          console.log(`💳 Stripe: Test-mode billing integration verified`);
        }).catch((err) => {
          console.warn(`⚠️  Stripe Config Notice: ${err.message}`);
        });
      } else {
        console.log(`💳 Stripe: Not configured (running in local metering mode)`);
      }

      // Start background jobs
      invoiceJob.start();
      reconcileJob.start();

      console.log('='.repeat(60));
      console.log('💡 Available commands:');
      console.log('   npm run dev:frontend - Start only the frontend UI');
      console.log('   npm run dev:all       - Start both backend and frontend');
      console.log('='.repeat(60));
    });
  }

  // Graceful shutdown handler for containerized and production environments
  let isShuttingDown = false;
  function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    // Stop recurring background jobs
    try {
      invoiceJob.stop();
      reconcileJob.stop();
      console.log('Stopped background cron jobs.');
    } catch (jobErr) {
      console.warn('Notice stopping background jobs:', jobErr.message);
    }

    if (server) {
      server.close(async () => {
        console.log('HTTP connection listener closed. Draining database connection pool...');
        try {
          await pool.end();
          console.log('Database connections cleanly terminated. Server shutdown complete.');
          process.exit(0);
        } catch (poolErr) {
          console.error('Error closing database pool:', poolErr.message);
          process.exit(1);
        }
      });

      // Force process exit if in-flight requests fail to drain within 10s
      setTimeout(() => {
        console.error('Graceful shutdown timed out after 10s. Forcing exit.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
