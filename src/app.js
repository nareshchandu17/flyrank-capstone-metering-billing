const express = require('express');
const cors = require('cors');
const meterRoutes = require('./routes/meterRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const usageRoutes = require('./routes/usageRoutes');
const historyRoutes = require('./routes/historyRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());

// Stripe webhooks require the raw body Buffer for HMAC verification.
// Mount raw parser on the webhook route prior to json parsing.
app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }));

// Standard body parsers for all other endpoints
app.use(express.json({
  verify: (req, res, buf) => {
    // Preserve raw body buffer for testing or edge cases
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', meterRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/history', historyRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

module.exports = app;
