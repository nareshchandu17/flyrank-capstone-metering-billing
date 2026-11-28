const rateLimit = require('express-rate-limit');

const VALID_FAILURE_POLICIES = new Set(['fail-closed', 'fail-open']);
const REDIS_CONNECT_TIMEOUT_MS = 5000;

function resolveFailurePolicy(env = process.env) {
  const configured = (env.RATE_LIMIT_FAILURE_POLICY || '').trim().toLowerCase();
  if (!configured) return env.NODE_ENV === 'production' ? 'fail-closed' : 'fail-open';

  if (!VALID_FAILURE_POLICIES.has(configured)) {
    throw new Error(`Invalid RATE_LIMIT_FAILURE_POLICY "${configured}". Must be "fail-closed" or "fail-open".`);
  }
  if (env.NODE_ENV === 'production' && configured !== 'fail-closed') {
    throw new Error('FATAL CONFIGURATION ERROR: RATE_LIMIT_FAILURE_POLICY must be "fail-closed" in production.');
  }
  return configured;
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Production requires Redis and fails closed for both connection loss and
 * RedisStore command errors. IORedis reconnects automatically; traffic resumes
 * only after its ready event. Development may use the in-memory store.
 */
function createRateLimiters(options = {}) {
  const env = options.env || process.env;
  const isProduction = env.NODE_ENV === 'production';
  const redisUrl = (env.REDIS_URL || '').trim();
  const failurePolicy = options.failurePolicy || resolveFailurePolicy(env);

  if (!VALID_FAILURE_POLICIES.has(failurePolicy)) {
    throw new Error(`Invalid rate limiter failure policy "${failurePolicy}".`);
  }
  if (isProduction && failurePolicy !== 'fail-closed') {
    throw new Error('FATAL CONFIGURATION ERROR: Production rate limiting must fail closed.');
  }
  if (isProduction && !redisUrl && !options.storeFactory) {
    throw new Error('FATAL CONFIGURATION ERROR: REDIS_URL is required in production for distributed rate limiting.');
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
  let redisClient = options.redisClient || null;

  const recordRedisError = (err) => {
    state.redisConnected = false;
    state.errorCount += 1;
    state.lastError = err instanceof Error ? err.message : String(err || 'Unknown Redis error');
    console.error('[RateLimiter] Redis error:', state.lastError);
  };

  const attachRedisListeners = (client) => {
    if (!client || typeof client.on !== 'function') return;
    state.client = client;
    client.on('ready', () => {
      state.redisConnected = true;
      state.lastError = null;
      console.log('[RateLimiter] Redis ready for distributed rate limiting.');
    });
    client.on('connect', () => { state.redisConnected = false; });
    client.on('close', () => {
      state.redisConnected = false;
      console.warn('[RateLimiter] Redis closed; rate-limited requests will fail closed.');
    });
    client.on('reconnecting', () => {
      state.redisConnected = false;
      console.warn('[RateLimiter] Redis reconnecting; rate-limited requests will fail closed.');
    });
    client.on('end', () => { state.redisConnected = false; });
    client.on('error', recordRedisError);
    state.redisConnected = client.status === 'ready';
  };

  if (redisUrl && !storeFactory) {
    try {
      const { RedisStore } = require('rate-limit-redis');
      const IORedis = require('ioredis');
      redisClient = redisClient || new IORedis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        retryStrategy: (attempt) => Math.min(attempt * 250, 3000),
      });
      attachRedisListeners(redisClient);
      storeFactory = (prefix) => new RedisStore({
        prefix,
        sendCommand: (...args) => redisClient.call(...args),
      });
      state.mode = 'redis';
      console.log(`[RateLimiter] Configured RedisStore (failurePolicy=${failurePolicy}).`);
    } catch (err) {
      recordRedisError(err);
      if (isProduction) {
        throw new Error(`FATAL CONFIGURATION ERROR: Cannot initialize production Redis rate limiting: ${err.message}`);
      }
      console.warn('[RateLimiter] Redis initialization failed; using in-memory limiter in non-production only.');
      storeFactory = null;
      redisClient = null;
      state.mode = 'memory';
    }
  } else if (storeFactory) {
    state.mode = 'redis';
    if (redisClient) attachRedisListeners(redisClient);
    else state.redisConnected = options.initialConnected !== false;
  }

  if (isProduction && !redisClient && !options.storeFactory) {
    throw new Error('FATAL CONFIGURATION ERROR: Production rate limiting requires an initialized Redis client.');
  }

  const buildLimiter = ({ prefix, windowMs, max, message }) => {
    const limiter = rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      store: storeFactory ? storeFactory(prefix) : undefined,
      passOnStoreError: false,
      message,
    });

    return (req, res, next) => {
      if (state.mode === 'redis' && !state.redisConnected) {
        state.errorCount += 1;
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Rate limiting service is temporarily unavailable. Please retry shortly.',
        });
      }
      return limiter(req, res, (err) => {
        if (!err) return next();
        recordRedisError(err);
        if (failurePolicy === 'fail-closed') {
          return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Rate limiting service is temporarily unavailable. Please retry shortly.',
          });
        }
        return next();
      });
    };
  };

  const apiLimiter = buildLimiter({
    prefix: 'rl:api:', windowMs: 15 * 60 * 1000, max: options.apiMax || 300,
    message: { error: 'Too Many Requests', message: 'Too many requests from this IP. Please retry after 15 minutes.' },
  });
  const sensitiveOpLimiter = buildLimiter({
    prefix: 'rl:sensitive:', windowMs: 15 * 60 * 1000, max: options.sensitiveMax || 50,
    message: { error: 'Too Many Requests', message: 'Too many sensitive operations requested. Please retry later.' },
  });
  const ingestionLimiter = buildLimiter({
    prefix: 'rl:ingestion:', windowMs: 60 * 1000, max: options.ingestionMax || 10000,
    message: { error: 'Rate Limit Exceeded', message: 'Usage ingestion rate limit exceeded. Please back off and retry.' },
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
    waitUntilReady: async (timeoutMs = REDIS_CONNECT_TIMEOUT_MS) => {
      if (state.mode !== 'redis') {
        if (isProduction) throw new Error('Production rate limiting has no Redis store.');
        return;
      }
      if (!redisClient) {
        if (isProduction) throw new Error('Production Redis client is unavailable.');
        return;
      }
      if (redisClient.status === 'wait' && typeof redisClient.connect === 'function') {
        await redisClient.connect();
      }
      await withTimeout(redisClient.ping(), timeoutMs, 'Initial Redis readiness check');
      if (redisClient.status !== 'ready') {
        throw new Error('Redis PING succeeded but the client is not in ready state.');
      }
      state.redisConnected = true;
      state.lastError = null;
    },
    close: async () => {
      if (redisClient && typeof redisClient.quit === 'function') {
        try {
          if (redisClient.status !== 'end') await redisClient.quit();
        } catch (err) {
          console.warn('[RateLimiter] Error closing Redis client:', err.message);
          if (typeof redisClient.disconnect === 'function') redisClient.disconnect();
        }
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
  waitForRateLimiterReady: defaultLimiters.waitUntilReady,
  closeRateLimiter: defaultLimiters.close,
  createRateLimiters,
  resolveFailurePolicy,
};
