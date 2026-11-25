const rateLimit = require('express-rate-limit');

const VALID_FAILURE_POLICIES = new Set(['fail-closed', 'fail-open']);

/**
 * Resolve explicit rate-limit failure policy when Redis is unavailable.
 * Defaults to 'fail-closed' in production and 'fail-open' in non-production.
 */
function resolveFailurePolicy(env = process.env) {
  const configured = (env.RATE_LIMIT_FAILURE_POLICY || '').trim().toLowerCase();
  if (!configured) {
    return env.NODE_ENV === 'production' ? 'fail-closed' : 'fail-open';
  }
  if (!VALID_FAILURE_POLICIES.has(configured)) {
    throw new Error(
      `Invalid RATE_LIMIT_FAILURE_POLICY "${configured}". Must be "fail-closed" or "fail-open".`
    );
  }
  return configured;
}

/**
 * Create distributed or development rate limiters with explicit Redis & failure-policy enforcement.
 * @param {Object} [options]
 */
function createRateLimiters(options = {}) {
  const env = options.env || process.env;
  const isProduction = env.NODE_ENV === 'production';
  const redisUrl = (env.REDIS_URL || '').trim();
  const failurePolicy = options.failurePolicy || resolveFailurePolicy(env);

  if (!VALID_FAILURE_POLICIES.has(failurePolicy)) {
    throw new Error(
      `Invalid rate limiter failure policy "${failurePolicy}". Must be "fail-closed" or "fail-open".`
    );
  }

  const state = {
    mode: 'memory',
    failurePolicy,
    redisConfigured: Boolean(redisUrl),
    redisConnected: false,
    lastError: null,
    errorCount: 0,
    client: null,
  };

  let storeFactory = options.storeFactory || null;

  if (isProduction && !redisUrl && !storeFactory) {
    throw new Error(
      'FATAL CONFIGURATION ERROR: REDIS_URL is required in production for distributed rate limiting.'
    );
  }

  const attachRedisListeners = (client) => {
    if (!client) return;
    state.client = client;
    if (typeof client.on === 'function') {
      client.on('connect', () => {
        state.redisConnected = true;
        state.lastError = null;
        console.log('[RateLimiter] Redis connected for distributed rate limiting.');
      });

      client.on('ready', () => {
        state.redisConnected = true;
        state.lastError = null;
      });

      client.on('close', () => {
        state.redisConnected = false;
        console.warn('[RateLimiter] Redis connection closed.');
      });

      client.on('reconnecting', () => {
        state.redisConnected = false;
        console.warn('[RateLimiter] Redis reconnecting...');
      });

      client.on('error', (err) => {
        state.redisConnected = false;
        state.errorCount += 1;
        state.lastError = err ? err.message : 'Unknown Redis error';
        console.error('[RateLimiter] Redis connection error:', state.lastError);
      });
    }

    if (client.status === 'ready' || client.status === 'connect') {
      state.redisConnected = true;
    }
  };

  if (redisUrl && !storeFactory) {
    try {
      const { RedisStore } = require('rate-limit-redis');
      const IORedis = require('ioredis');
      const client = options.redisClient || new IORedis(redisUrl, {
        enableOfflineQueue: failurePolicy === 'fail-open',
        maxRetriesPerRequest: 2,
      });

      state.mode = 'redis';
      attachRedisListeners(client);

      storeFactory = (prefix) =>
        new RedisStore({
          prefix,
          sendCommand: (...args) => client.call(...args),
        });

      console.log(
        `[RateLimiter] Configured distributed RedisStore (failurePolicy=${failurePolicy}).`
      );
    } catch (err) {
      state.errorCount += 1;
      state.lastError = err.message;
      if (isProduction) {
        throw new Error(
          `FATAL CONFIGURATION ERROR: Distributed Redis rate limiter failed to initialize in production: ${err.message}`
        );
      }
      console.warn(
        '[RateLimiter] REDIS_URL provided but Redis driver could not be loaded. Operating with in-memory store:',
        err.message
      );
      storeFactory = null;
      state.mode = 'memory';
    }
  } else if (storeFactory) {
    state.mode = 'redis';
    state.redisConnected = options.initialConnected !== false;
    if (options.redisClient) {
      attachRedisListeners(options.redisClient);
    }
  }

  const buildLimiter = ({ prefix, windowMs, max, message }) => {
    const store = storeFactory ? storeFactory(prefix) : undefined;
    const limiter = rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      store,
      passOnStoreError: failurePolicy === 'fail-open',
      message,
    });

    // Enforce explicit fail-open / fail-closed policy on store or Redis unavailability
    return (req, res, next) => {
      if (state.mode === 'redis' && options.enforceConnectionCheck && !state.redisConnected) {
        state.errorCount += 1;
        console.error(
          `[RateLimiter] Redis unavailable (${state.lastError || 'disconnected'}); applying ${failurePolicy} policy.`
        );
        if (failurePolicy === 'fail-closed') {
          return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Rate limiting service is temporarily unavailable.',
          });
        }
        return next();
      }

      return limiter(req, res, (err) => {
        if (!err) {
          return next();
        }
        state.errorCount += 1;
        state.lastError = err.message;
        console.error(
          `[RateLimiter] Store error (${err.message}); applying ${failurePolicy} policy.`
        );
        if (failurePolicy === 'fail-closed') {
          return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Rate limiting service is temporarily unavailable.',
          });
        }
        return next();
      });
    };
  };

  /**
   * Standard API Rate Limiter
   * Applies to standard human-facing API endpoints
   */
  const apiLimiter = buildLimiter({
    prefix: 'rl:api:',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: options.apiMax || 300, // Limit each IP to 300 requests per 15 minutes
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  });

  /**
   * Sensitive Operations Rate Limiter
   * Applies to checkout sessions, API key creation/rotation, and invitation acceptance
   */
  const sensitiveOpLimiter = buildLimiter({
    prefix: 'rl:sensitive:',
    windowMs: 15 * 60 * 1000,
    max: options.sensitiveMax || 50, // Limit to 50 requests per 15 minutes
    message: {
      error: 'Too Many Requests',
      message: 'Too many sensitive operations requested, please try again later',
    },
  });

  /**
   * High-Throughput Machine Ingestion Rate Limiter
   * Applied to POST /api/usage for high-frequency micro-cent metering events
   */
  const ingestionLimiter = buildLimiter({
    prefix: 'rl:ingestion:',
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: options.ingestionMax || 10000, // Up to 10,000 events/minute per IP
    message: {
      error: 'Rate Limit Exceeded',
      message: 'Usage ingestion rate limit exceeded. Please back off and retry.',
    },
  });

  return {
    apiLimiter,
    sensitiveOpLimiter,
    ingestionLimiter,
    getStatus: () => ({
      mode: state.mode,
      failurePolicy: state.failurePolicy,
      redisConfigured: state.redisConfigured,
      redisConnected: state.redisConnected,
      errorCount: state.errorCount,
      lastError: state.lastError,
    }),
    setRedisConnected: (connected, errorMsg = null) => {
      state.redisConnected = Boolean(connected);
      if (errorMsg) {
        state.lastError = errorMsg;
        state.errorCount += 1;
      }
    },
    close: async () => {
      if (state.client && typeof state.client.quit === 'function') {
        await state.client.quit();
      }
    },
  };
}

const defaultLimiters = createRateLimiters();

module.exports = {
  apiLimiter: defaultLimiters.apiLimiter,
  sensitiveOpLimiter: defaultLimiters.sensitiveOpLimiter,
  ingestionLimiter: defaultLimiters.ingestionLimiter,
  getRateLimiterStatus: defaultLimiters.getStatus,
  closeRateLimiter: defaultLimiters.close,
  createRateLimiters,
  resolveFailurePolicy,
};
