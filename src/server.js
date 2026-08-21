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
    
    // You can run schema initialization here if needed
    // For now, we assume schema.sql has been run manually
    
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
    console.log(`🎨 Frontend UI: http://localhost:5177`);
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
