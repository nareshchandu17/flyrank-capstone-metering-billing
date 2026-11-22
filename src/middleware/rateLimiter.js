const rateLimit = require('express-rate-limit');

/**
 * Configure rate limiter store factory.
 * If REDIS_URL is provided, attempts to load rate-limit-redis.
 * Falls back gracefully to memory store in development or when Redis is absent.
 */
let store = undefined;
if (process.env.REDIS_URL) {
  try {
    const { RedisStore } = require('rate-limit-redis');
    const IORedis = require('ioredis');
    const client = new IORedis(process.env.REDIS_URL);
    store = new RedisStore({
      sendCommand: (...args) => client.call(...args),
    });
    console.log('[RateLimiter] Configured distributed RedisStore for rate limiting.');
  } catch (err) {
    console.warn('[RateLimiter] REDIS_URL provided but Redis driver could not be loaded. Operating with in-memory store:', err.message);
  }
}

/**
 * Standard API Rate Limiter
 * Applies to standard human-facing API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store,
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
  store,
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
  store,
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
