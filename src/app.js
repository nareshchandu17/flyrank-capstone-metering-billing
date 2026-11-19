const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');
const meterRoutes = require('./routes/meterRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const usageRoutes = require('./routes/usageRoutes');
const historyRoutes = require('./routes/historyRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// 2. Strict CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow machine server-to-server or CLI requests with no browser origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID']
}));

// 3. Global API Rate Limiting (Applied to all /api routes)
app.use('/api', apiLimiter);

// 4. Stripe Webhooks: Raw Body Parser (must mount before json parsing)
app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }));

// 5. Standard Body Parsers
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// 6. Routes
app.use('/api', meterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/history', historyRoutes);

// 7. Error handling
app.use(errorHandler);

// 8. 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

module.exports = app;
