const express = require('express');
const meterRoutes = require('./routes/meterRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', meterRoutes);
app.use('/api/stripe', stripeRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

module.exports = app;
