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
