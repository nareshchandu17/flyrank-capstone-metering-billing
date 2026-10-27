require('dotenv').config();
const app = require('./app');
const pool = require('./config/database');
const invoiceJob = require('./jobs/invoiceJob');
const reconcileJob = require('./jobs/reconcileJob');

const PORT = process.env.PORT || 3000;

// Database initialization
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('Database connection established');
    
    // Ensure critical columns exist for existing databases
    await client.query(`
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
          status VARCHAR(50) DEFAULT 'processed',
          processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 Usage Metering & Billing Engine - Backend Server');
    console.log('='.repeat(60));
    console.log(`✅ Backend API running on port ${PORT}`);
    console.log(`📡 API Endpoint: http://localhost:${PORT}`);
    console.log(`🎨 Frontend UI: http://localhost:5173`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
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

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
