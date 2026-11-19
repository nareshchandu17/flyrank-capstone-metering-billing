const rateLimit = require('express-rate-limit');

/**
 * Standard API Rate Limiter
 * Applies to standard human-facing API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

/**
 * Sensitive Operations Rate Limiter
 * Applies to checkout sessions, API key creation/rotation, and invitation acceptance
 */
const sensitiveOpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limit to 50 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many sensitive operations requested, please try again later'
  }
});

/**
 * High-Throughput Machine Ingestion Rate Limiter
 * Applied to POST /api/usage for high-frequency micro-cent metering events
 */
const ingestionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10000, // Up to 10,000 events/minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Usage ingestion rate limit exceeded. Please back off and retry.'
  }
});

module.exports = {
  apiLimiter,
  sensitiveOpLimiter,
  ingestionLimiter
};
