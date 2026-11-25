const pool = require('../config/database');
const notificationService = require('./notificationService');
const { 
  PRICING_CONFIG, 
  calculateAPICallCost, 
  calculateAITokenCost, 
  calculateAITokenCostMicroCents,
  calculateTokenCost
} = require('../config/pricing');

class MeterService {
  /**
   * Validate input parameters strictly
   */
  validateUsageInput(tenantId, usageType, quantity, idempotencyKey, metadata = {}) {
    if (!tenantId || typeof tenantId !== 'string') {
      const err = new Error('Invalid or missing tenant_id');
      err.statusCode = 400;
      throw err;
    }

    const validUsageTypes = ['api_call', 'ai_tokens'];
    if (!usageType || !validUsageTypes.includes(usageType)) {
      const err = new Error(`Invalid usage_type: "${usageType}". Must be one of: ${validUsageTypes.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Strict positive integer validation: reject floats, negative numbers, 0, strings, NaN, Infinity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      const err = new Error(`Quantity must be a positive integer greater than zero. Received: ${quantity}`);
      err.statusCode = 400;
      throw err;
    }

    // Strict idempotency key validation: length (1..255) and safe character set
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
      const err = new Error('Missing or invalid idempotency_key. Must be a non-empty string.');
      err.statusCode = 400;
      throw err;
    }
    if (idempotencyKey.length > 255) {
      const err = new Error('Invalid idempotency_key: exceeds maximum length of 255 characters.');
      err.statusCode = 400;
      throw err;
    }
    if (!/^[A-Za-z0-9._:-]{1,255}$/.test(idempotencyKey)) {
      const err = new Error(
        'Invalid idempotency_key: only alphanumeric characters, ".", "_", ":", and "-" are allowed.'
      );
      err.statusCode = 400;
      throw err;
    }

    if (metadata !== undefined && metadata !== null && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      const err = new Error('Invalid metadata: must be a JSON object.');
      err.statusCode = 400;
      throw err;
    }

    // Strict token breakdown validation if metadata contains token fields or aliases
    if (metadata && typeof metadata === 'object') {
      const tokenFields = [
        'input_tokens',
        'input',
        'cached_input_tokens',
        'cached_input',
        'cached_tokens',
        'output_tokens',
        'output',
        'reasoning_tokens',
        'reasoning',
      ];
      for (const field of tokenFields) {
        if (metadata[field] !== undefined && metadata[field] !== null) {
          if (typeof metadata[field] !== 'number' || !Number.isInteger(metadata[field]) || metadata[field] < 0) {
            const err = new Error(`Invalid metadata.${field}: "${metadata[field]}". Must be a non-negative integer.`);
            err.statusCode = 400;
            throw err;
          }
        }
      }
    }
  }

  /**
   * Parse raw metadata into an object safely.
   * @private
   */
  _parseMetadata(metadata) {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_err) {
        return {};
      }
    }
    return typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  }

  /**
   * Build canonical billable payload representation.
   * Normalization rules:
   * - Absent/null token fields normalize to 0 (matching 0 values).
   * - Token aliases (input, cached_input, cached_tokens, output, reasoning) normalize to canonical *_tokens keys.
   * - Other billing-affecting fields (model, tier, currency, billing_unit, unit_price_cents) normalize absent/null to null.
   */
  canonicalizeBillablePayload(usageType, quantity, metadata = {}) {
    const meta = this._parseMetadata(metadata);
    const toIntOrZero = (val) => (val === undefined || val === null ? 0 : Number(val));
    const toStrOrNull = (val) => (val === undefined || val === null || val === '' ? null : String(val).trim().toLowerCase());
    const toNumOrNull = (val) => (val === undefined || val === null ? null : Number(val));

    return {
      usage_type: usageType,
      quantity: Number(quantity),
      input_tokens: toIntOrZero(meta.input_tokens ?? meta.input),
      cached_input_tokens: toIntOrZero(meta.cached_input_tokens ?? meta.cached_input ?? meta.cached_tokens),
      output_tokens: toIntOrZero(meta.output_tokens ?? meta.output),
      reasoning_tokens: toIntOrZero(meta.reasoning_tokens ?? meta.reasoning),
      model: toStrOrNull(meta.model),
      tier: toStrOrNull(meta.tier),
      currency: toStrOrNull(meta.currency),
      billing_unit: toStrOrNull(meta.billing_unit),
      unit_price_cents: toNumOrNull(meta.unit_price_cents),
    };
  }

  /**
   * Normalize metadata for persistence so stored events use the same canonical rules as comparisons.
   */
  normalizeMetadataForStorage(usageType, metadata = {}) {
    const meta = { ...this._parseMetadata(metadata) };
    if (usageType === 'ai_tokens') {
      const canonical = this.canonicalizeBillablePayload(usageType, 0, meta);
      delete meta.input;
      delete meta.cached_input;
      delete meta.cached_tokens;
      delete meta.output;
      delete meta.reasoning;
      meta.input_tokens = canonical.input_tokens;
      meta.cached_input_tokens = canonical.cached_input_tokens;
      meta.output_tokens = canonical.output_tokens;
      meta.reasoning_tokens = canonical.reasoning_tokens;
    }
    return meta;
  }

  /**
   * Check if an existing event payload matches the incoming request using canonical billable fields.
   */
  isMatchingPayload(existingEvent, incomingUsageType, incomingQuantity, incomingMetadata = {}) {
    const existingCanonical = this.canonicalizeBillablePayload(
      existingEvent.usage_type,
      parseInt(existingEvent.quantity, 10),
      existingEvent.metadata
    );
    const incomingCanonical = this.canonicalizeBillablePayload(
      incomingUsageType,
      incomingQuantity,
      incomingMetadata
    );

    const keys = Object.keys(existingCanonical);
    for (const key of keys) {
      if (existingCanonical[key] !== incomingCanonical[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Record a usage event with atomic idempotency and concurrency-safe quota enforcement
   * @param {string} tenantId - Tenant UUID
   * @param {string} usageType - Type of usage ('api_call' or 'ai_tokens')
   * @param {number} quantity - Quantity of usage (positive integer)
   * @param {string} idempotencyKey - Unique key for idempotency
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Result with status and data
   */
  async recordUsage(tenantId, usageType, quantity, idempotencyKey, metadata = {}) {
    // 1. Strict input validation
    this.validateUsageInput(tenantId, usageType, quantity, idempotencyKey, metadata);

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 2. Check for duplicate idempotency key
      const duplicateCheck = await client.query(
        'SELECT id, tenant_id, usage_type, quantity, metadata, created_at FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2',
        [tenantId, idempotencyKey]
      );
      
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        const existing = duplicateCheck.rows[0];

        // Check for conflicting retry with same key but different payload
        if (!this.isMatchingPayload(existing, usageType, quantity, metadata)) {
          return {
            status: 'conflict',
            statusCode: 409,
            message: `Idempotency conflict: key "${idempotencyKey}" already used with different payload (existing: ${existing.usage_type} qty=${existing.quantity}, requested: ${usageType} qty=${quantity})`
          };
        }

        return {
          status: 'duplicate',
          statusCode: 200,
          message: 'Usage event already recorded',
          data: existing
        };
      }
      
      // 3. Concurrency-safe quota check (locks the tenant row using FOR UPDATE)
      const quotaCheck = await this.checkQuota(client, tenantId, usageType, quantity);
      
      if (!quotaCheck.allowed) {
        await client.query('ROLLBACK');
        return {
          status: 'rejected',
          message: quotaCheck.message,
          statusCode: quotaCheck.statusCode,
          quotaInfo: quotaCheck.quotaInfo
        };
      }
      
      // 4. Insert new usage event with canonically normalized metadata
      const normalizedMetadata = this.normalizeMetadataForStorage(usageType, metadata);
      const insertResult = await client.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tenantId, usageType, quantity, idempotencyKey, JSON.stringify(normalizedMetadata)]
      );
      
      await client.query('COMMIT');
      
      return {
        status: 'success',
        statusCode: 201,
        message: 'Usage event recorded',
        data: insertResult.rows[0]
      };
      
    } catch (error) {
      await client.query('ROLLBACK');

      // 5. Handle race condition: concurrent insert with same (tenant_id, idempotency_key)
      if (error.code === '23505' && (error.constraint?.includes('idempotency') || error.detail?.includes('idempotency'))) {
        try {
          const raceCheck = await pool.query(
            'SELECT id, tenant_id, usage_type, quantity, metadata, created_at FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2',
            [tenantId, idempotencyKey]
          );

          if (raceCheck.rows.length > 0) {
            const existing = raceCheck.rows[0];
            if (!this.isMatchingPayload(existing, usageType, quantity, metadata)) {
              return {
                status: 'conflict',
                statusCode: 409,
                message: `Idempotency conflict: key "${idempotencyKey}" already used with different payload`
              };
            }
            return {
              status: 'duplicate',
              statusCode: 200,
              message: 'Usage event already recorded',
              data: existing
            };
          }
        } catch (raceErr) {
          console.error('Error resolving idempotency race condition:', raceErr);
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Concurrency-safe quota check: uses row-level lock on the tenant
   * and deduplicates usage alerts per tenant, billing period, and metric type
   * @param {Object} client - Database client in active transaction
   * @param {string} tenantId - Tenant UUID
   * @param {string} usageType - Type of usage ('api_call' or 'ai_tokens')
   * @param {number} requestedQuantity - Requested quantity (positive integer)
   * @returns {Object} - Quota check result
   */
  async checkQuota(client, tenantId, usageType, requestedQuantity) {
    // 1. Inspect tenant and plan quota parameters
    const tenantQuery = `
      SELECT t.id, t.name, t.email, t.plan_id, p.api_calls_limit, p.ai_tokens_limit, p.allow_overage
      FROM tenants t
      JOIN plans p ON t.plan_id = p.id
      WHERE t.id = $1 AND t.status = 'active'
    `;
    
    const tenantResult = await client.query(tenantQuery, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      return {
        allowed: false,
        message: 'Tenant not found or inactive',
        statusCode: 404
      };
    }
    
    const tenant = tenantResult.rows[0];

    // For plans without overage (e.g. Free tier), acquire an exclusive row-lock on tenant
    // to strictly serialize quota evaluations without race conditions.
    // For Pro/Enterprise tiers where overage is permitted, lock-free evaluation permits high-throughput concurrent writes.
    if (!tenant.allow_overage) {
      await client.query('SELECT 1 FROM tenants WHERE id = $1 FOR UPDATE', [tenantId]);
    }

    const limit = usageType === 'api_call' ? tenant.api_calls_limit : tenant.ai_tokens_limit;
    
    // Get current usage for the current month
    const billingPeriod = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    
    const usageQuery = `
      SELECT COALESCE(SUM(quantity), 0) as total_usage
      FROM usage_events
      WHERE tenant_id = $1
        AND usage_type = $2
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    `;
    
    const usageResult = await client.query(usageQuery, [tenantId, usageType]);
    const currentUsage = parseInt(usageResult.rows[0].total_usage, 10);
    const newUsage = currentUsage + requestedQuantity;
    
    // Deduplicated alerts per (tenant_id, alert_type, billing_period, metric_type)
    const threshold80 = limit * 0.8;
    if (newUsage >= threshold80) {
      const alertType = newUsage >= limit ? '100_percent' : '80_percent';
      
      try {
        const alertRes = await client.query(
          `INSERT INTO usage_alerts (tenant_id, alert_type, billing_period, metric_type) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tenant_id, alert_type, billing_period, metric_type) DO NOTHING
           RETURNING id`,
          [tenantId, alertType, billingPeriod, usageType]
        );
        if (alertRes.rows.length > 0) {
          // Asynchronously dispatch real notifications (outbound webhooks / email)
          notificationService.dispatchUsageAlert({
            tenantId,
            tenantName: tenant.name,
            tenantEmail: tenant.email,
            alertType,
            metricType: usageType,
            billingPeriod,
            currentUsage: newUsage,
            limit
          }).catch(notifErr => {
            console.error('Error dispatching usage alert notification:', notifErr.message);
          });
        }
      } catch (err) {
        // Silently ignore if already recorded
      }
    }
    
    // Check if requested usage would exceed limit
    if (newUsage > limit) {
      if (!tenant.allow_overage) {
        const remaining = limit - currentUsage;
        
        return {
          allowed: false,
          message: `Quota exceeded. Current usage: ${currentUsage}, Limit: ${limit}, Requested: ${requestedQuantity}`,
          statusCode: currentUsage >= limit ? 429 : 402, // 429 if already at limit, 402 if would exceed
          quotaInfo: {
            currentUsage,
            limit,
            requested: requestedQuantity,
            remaining: Math.max(0, remaining)
          }
        };
      }
    }
    
    return {
      allowed: true,
      quotaInfo: {
        currentUsage,
        limit,
        requested: requestedQuantity,
        remaining: Math.max(0, limit - newUsage)
      }
    };
  }
  
  /**
   * Get usage summary with accurate aggregation of all token types
   * and precise cost calculation avoiding rounding small tokens down to zero
   * @param {string} tenantId - Tenant UUID
   * @returns {Object} - Usage summary with complete breakdown and exact costs
   */
  async getUsageSummary(tenantId) {
    // 1. Get tenant info with plan
    const tenantQuery = `
      SELECT t.id, t.name, t.plan_id, p.name as plan_name, 
             p.api_calls_limit, p.ai_tokens_limit, p.allow_overage
      FROM tenants t
      JOIN plans p ON t.plan_id = p.id
      WHERE t.id = $1
    `;
    
    const tenantResult = await pool.query(tenantQuery, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const tenant = tenantResult.rows[0];
    
    // 2. Query usage events with complete token breakdown from metadata
    const aggregationQuery = `
      SELECT 
        usage_type,
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(COALESCE((metadata->>'input_tokens')::numeric, 0)), 0) as total_input_tokens,
        COALESCE(SUM(COALESCE((metadata->>'cached_input_tokens')::numeric, (metadata->>'cached_tokens')::numeric, 0)), 0) as total_cached_input_tokens,
        COALESCE(SUM(COALESCE((metadata->>'output_tokens')::numeric, 0)), 0) as total_output_tokens,
        COALESCE(SUM(COALESCE((metadata->>'reasoning_tokens')::numeric, 0)), 0) as total_reasoning_tokens
      FROM usage_events
      WHERE tenant_id = $1
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
      GROUP BY usage_type
    `;
    
    const aggResult = await pool.query(aggregationQuery, [tenantId]);
    
    let apiCallsUsed = 0;
    let aiTokensUsed = 0;
    let inputTokens = 0;
    let cachedInputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;

    aggResult.rows.forEach(row => {
      if (row.usage_type === 'api_call') {
        apiCallsUsed = parseInt(row.total_quantity, 10);
      } else if (row.usage_type === 'ai_tokens') {
        aiTokensUsed = parseInt(row.total_quantity, 10);
        inputTokens = parseInt(row.total_input_tokens, 10);
        cachedInputTokens = parseInt(row.total_cached_input_tokens, 10);
        outputTokens = parseInt(row.total_output_tokens, 10);
        reasoningTokens = parseInt(row.total_reasoning_tokens, 10);

        // Map any unallocated quantity (events with no metadata breakdown) to input tokens
        const brokenDownTokens = inputTokens + cachedInputTokens + outputTokens + reasoningTokens;
        if (aiTokensUsed > brokenDownTokens) {
          inputTokens += (aiTokensUsed - brokenDownTokens);
        }
      }
    });

    const tokenBreakdown = {
      input_tokens: inputTokens,
      cached_input_tokens: cachedInputTokens,
      output_tokens: outputTokens,
      reasoning_tokens: reasoningTokens
    };
    
    // 3. Accurate Money Math: Calculate on accumulated monthly sums to prevent rounding down to zero
    const apiCallCost = calculateAPICallCost(apiCallsUsed);
    const aiTokenExactCents = calculateAITokenCost(tokenBreakdown, { exact: true });
    const aiTokenMicroCents = calculateAITokenCostMicroCents(tokenBreakdown);
    const aiTokenCostCents = Math.round(aiTokenExactCents);

    const totalCents = apiCallCost + aiTokenCostCents;
    const totalExactCents = apiCallCost + aiTokenExactCents;
    const totalDollars = (totalExactCents / 100).toFixed(2);
    const totalDollarsExact = (totalExactCents / 100).toFixed(4);

    // Overages
    const apiCallsOverage = Math.max(0, apiCallsUsed - tenant.api_calls_limit);
    const aiTokensOverage = Math.max(0, aiTokensUsed - tenant.ai_tokens_limit);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan_name,
        allow_overage: tenant.allow_overage
      },
      usage: {
        api_calls: {
          used: apiCallsUsed,
          limit: tenant.api_calls_limit,
          remaining: Math.max(0, tenant.api_calls_limit - apiCallsUsed),
          overage: apiCallsOverage
        },
        ai_tokens: {
          used: aiTokensUsed,
          limit: tenant.ai_tokens_limit,
          remaining: Math.max(0, tenant.ai_tokens_limit - aiTokensUsed),
          overage: aiTokensOverage,
          breakdown: tokenBreakdown
        }
      },
      costs: {
        api_calls_cents: apiCallCost,
        ai_tokens_cents: aiTokenCostCents,
        ai_tokens_cents_exact: aiTokenExactCents,
        ai_tokens_micro_cents: aiTokenMicroCents,
        token_breakdown_cents: {
          input: calculateTokenCost('input', inputTokens, { exact: true }),
          cached_input: calculateTokenCost('cached_input', cachedInputTokens, { exact: true }),
          output: calculateTokenCost('output', outputTokens, { exact: true }),
          reasoning: calculateTokenCost('reasoning', reasoningTokens, { exact: true })
        },
        total_cents: totalCents,
        total_dollars: totalDollars,
        total_dollars_exact: totalDollarsExact
      }
    };
  }
}

module.exports = new MeterService();
