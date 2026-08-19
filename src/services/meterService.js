const pool = require('../config/database');
const { calculateAPICallCost, calculateAITokenCost } = require('../config/pricing');

class MeterService {
  /**
   * Record a usage event with idempotency guarantee
   * @param {string} tenantId - Tenant UUID
   * @param {string} usageType - Type of usage ('api_call' or 'ai_tokens')
   * @param {number} quantity - Quantity of usage
   * @param {string} idempotencyKey - Unique key for idempotency
   * @param {Object} metadata - Additional metadata (for AI tokens breakdown)
   * @returns {Object} - Result with status and data
   */
  async recordUsage(tenantId, usageType, quantity, idempotencyKey, metadata = {}) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check for duplicate idempotency key
      const duplicateCheck = await client.query(
        'SELECT id, quantity, metadata FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2',
        [tenantId, idempotencyKey]
      );
      
      if (duplicateCheck.rows.length > 0) {
        // Idempotency key exists - return original result
        await client.query('ROLLBACK');
        return {
          status: 'duplicate',
          message: 'Usage event already recorded',
          data: duplicateCheck.rows[0]
        };
      }
      
      // Check quota before recording
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
      
      // Insert new usage event
      const insertResult = await client.query(
        `INSERT INTO usage_events (tenant_id, usage_type, quantity, idempotency_key, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tenantId, usageType, quantity, idempotencyKey, JSON.stringify(metadata)]
      );
      
      await client.query('COMMIT');
      
      return {
        status: 'success',
        message: 'Usage event recorded',
        data: insertResult.rows[0]
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Check if tenant has sufficient quota for the requested usage
   * @param {Object} client - Database client
   * @param {string} tenantId - Tenant UUID
   * @param {string} usageType - Type of usage
   * @param {number} requestedQuantity - Requested quantity
   * @returns {Object} - Quota check result
   */
  async checkQuota(client, tenantId, usageType, requestedQuantity) {
    // Get tenant's plan limits
    const tenantQuery = `
      SELECT t.plan_id, p.api_calls_limit, p.ai_tokens_limit
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
    const limit = usageType === 'api_call' ? tenant.api_calls_limit : tenant.ai_tokens_limit;
    
    // Get current usage for the current month
    const usageQuery = `
      SELECT COALESCE(SUM(quantity), 0) as total_usage
      FROM usage_events
      WHERE tenant_id = $1
        AND usage_type = $2
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    `;
    
    const usageResult = await client.query(usageQuery, [tenantId, usageType]);
    const currentUsage = parseInt(usageResult.rows[0].total_usage);
    
    // Check if requested usage would exceed limit
    if (currentUsage + requestedQuantity > limit) {
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
    
    return {
      allowed: true,
      quotaInfo: {
        currentUsage,
        limit,
        requested: requestedQuantity,
        remaining: limit - currentUsage - requestedQuantity
      }
    };
  }
  
  /**
   * Get usage summary for a tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Object} - Usage summary with costs
   */
  async getUsageSummary(tenantId) {
    // Get tenant info with plan
    const tenantQuery = `
      SELECT t.id, t.name, t.plan_id, p.name as plan_name, 
             p.api_calls_limit, p.ai_tokens_limit
      FROM tenants t
      JOIN plans p ON t.plan_id = p.id
      WHERE t.id = $1
    `;
    
    const tenantResult = await pool.query(tenantQuery, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const tenant = tenantResult.rows[0];
    
    // Get current month's usage
    const usageQuery = `
      SELECT 
        usage_type,
        SUM(quantity) as total_quantity
      FROM usage_events
      WHERE tenant_id = $1
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
      GROUP BY usage_type
    `;
    
    const usageResult = await pool.query(usageQuery, [tenantId]);
    
    const usageData = {};
    usageResult.rows.forEach(row => {
      usageData[row.usage_type] = parseInt(row.total_quantity);
    });
    
    // Calculate costs
    const apiCallsUsed = usageData['api_call'] || 0;
    const aiTokensUsed = usageData['ai_tokens'] || 0;
    
    const apiCallCost = calculateAPICallCost(apiCallsUsed);
    const aiTokenCost = this.calculateAITokenCostFromUsage(usageData);
    const totalCost = apiCallCost + aiTokenCost;
    
    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan_name
      },
      usage: {
        api_calls: {
          used: apiCallsUsed,
          limit: tenant.api_calls_limit,
          remaining: Math.max(0, tenant.api_calls_limit - apiCallsUsed)
        },
        ai_tokens: {
          used: aiTokensUsed,
          limit: tenant.ai_tokens_limit,
          remaining: Math.max(0, tenant.ai_tokens_limit - aiTokensUsed)
        }
      },
      costs: {
        api_calls_cents: apiCallCost,
        ai_tokens_cents: aiTokenCost,
        total_cents: totalCost,
        total_dollars: (totalCost / 100).toFixed(2)
      }
    };
  }
  
  /**
   * Calculate AI token cost from usage data
   * @param {Object} usageData - Usage data by type
   * @returns {number} - Cost in cents
   */
  calculateAITokenCostFromUsage(usageData) {
    // For simple ai_tokens usage, we use a standard rate
    // In a real implementation, this would parse metadata for token breakdown
    const { calculateAITokenCost } = require('../config/pricing');
    
    // If we have detailed metadata, use it
    if (usageData.metadata && typeof usageData.metadata === 'object') {
      return calculateAITokenCost(usageData.metadata);
    }
    
    // Otherwise use standard rate for ai_tokens
    const simpleTokens = usageData['ai_tokens'] || 0;
    return calculateAITokenCost({ input_tokens: simpleTokens });
  }
}

module.exports = new MeterService();
