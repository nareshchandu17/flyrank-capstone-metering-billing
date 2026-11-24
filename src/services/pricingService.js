const pool = require('../config/database');

/**
 * Database-Driven Pricing and Quota Service
 * 
 * Manages dynamic billing rates and plan configurations directly from PostgreSQL.
 * Rates and quotas are loaded from the database and cached with a short TTL,
 * ensuring database updates immediately reflect in calculations without redeployment.
 */

class PricingService {
  constructor() {
    this._cache = {
      rules: null,
      plans: null,
      lastFetched: 0,
    };
    this.CACHE_TTL_MS = 2000; // 2 seconds TTL allows immediate reflection of DB updates
  }

  /**
   * Invalidate memory cache so next call immediately queries database
   */
  invalidateCache() {
    this._cache = {
      rules: null,
      plans: null,
      lastFetched: 0,
    };
  }

  /**
   * Validate pricing rules structure and consistency
   * @param {Array<Object>} rules 
   */
  validatePricingRules(rules) {
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new Error('Pricing configuration error: No active pricing rules found in database.');
    }

    const apiRules = rules.filter(r => r.category === 'api_call');
    const aiRules = rules.filter(r => r.category === 'ai_token');

    if (apiRules.length === 0) {
      throw new Error('Pricing configuration error: No active pricing rules configured for category "api_call".');
    }

    if (aiRules.length === 0) {
      throw new Error('Pricing configuration error: No active pricing rules configured for category "ai_token".');
    }

    // Validate tier boundaries for api_call rules
    const sortedApi = [...apiRules].sort((a, b) => (Number(a.tier_min_units) || 0) - (Number(b.tier_min_units) || 0));
    for (let i = 0; i < sortedApi.length; i++) {
      const rule = sortedApi[i];
      if (Number(rule.rate_cents) < 0) {
        throw new Error(`Invalid rate for rule ${rule.rule_key}: rate cannot be negative.`);
      }
      if (Number(rule.billing_unit) <= 0) {
        throw new Error(`Invalid billing unit for rule ${rule.rule_key}: billing unit must be positive.`);
      }
    }

    // Validate AI token rules
    for (const rule of aiRules) {
      if (Number(rule.rate_cents) < 0) {
        throw new Error(`Invalid rate for rule ${rule.rule_key}: rate cannot be negative.`);
      }
      if (Number(rule.billing_unit) <= 0) {
        throw new Error(`Invalid billing unit for rule ${rule.rule_key}: billing unit must be positive.`);
      }
    }

    return true;
  }

  /**
   * Load active pricing rules from database
   * @param {Object} [client] - Database client or pool
   * @returns {Promise<Array<Object>>}
   */
  async loadPricingRules(client = pool) {
    const query = `
      SELECT id, category, rule_key, tier_name, rate_cents, billing_unit, currency, 
             tier_min_units, tier_max_units, is_active, metadata
      FROM pricing_rules
      WHERE is_active = true
      ORDER BY category, tier_min_units ASC NULLS FIRST
    `;
    const res = await client.query(query);
    const rules = res.rows.map(row => ({
      ...row,
      rate_cents: Number(row.rate_cents),
      billing_unit: Number(row.billing_unit),
      tier_min_units: row.tier_min_units != null ? Number(row.tier_min_units) : 0,
      tier_max_units: row.tier_max_units != null ? Number(row.tier_max_units) : null,
    }));

    this.validatePricingRules(rules);
    this._cache.rules = rules;
    this._cache.lastFetched = Date.now();
    return rules;
  }

  /**
   * Load all plans from database
   * @param {Object} [client] - Database client or pool
   * @returns {Promise<Object>} Map of planName -> planObject
   */
  async loadPlans(client = pool) {
    const query = `
      SELECT id, name, api_calls_limit, ai_tokens_limit, allow_overage, 
             COALESCE(base_price_cents, 0) as base_price_cents, stripe_price_id
      FROM plans
      ORDER BY base_price_cents ASC
    `;
    const res = await client.query(query);
    const planMap = {};
    for (const row of res.rows) {
      planMap[row.name] = {
        id: row.id,
        name: row.name,
        api_calls_limit: Number(row.api_calls_limit),
        ai_tokens_limit: Number(row.ai_tokens_limit),
        allow_overage: Boolean(row.allow_overage),
        base_price_cents: Number(row.base_price_cents),
        stripe_price_id: row.stripe_price_id || null,
      };
    }

    this._cache.plans = planMap;
    return planMap;
  }

  /**
   * Get active pricing rules, refreshing cache if expired
   * @param {Object} [client] 
   * @returns {Promise<Array<Object>>}
   */
  async getActivePricingRules(client = pool) {
    const now = Date.now();
    if (this._cache.rules && (now - this._cache.lastFetched < this.CACHE_TTL_MS)) {
      return this._cache.rules;
    }
    return this.loadPricingRules(client);
  }

  /**
   * Get plans map, refreshing cache if expired
   * @param {Object} [client]
   * @returns {Promise<Object>}
   */
  async getPlans(client = pool) {
    const now = Date.now();
    if (this._cache.plans && (now - this._cache.lastFetched < this.CACHE_TTL_MS)) {
      return this._cache.plans;
    }
    return this.loadPlans(client);
  }

  /**
   * Synchronously get cached rules or throw controlled configuration error
   * @param {string} [category]
   * @returns {Array<Object>}
   */
  getCachedRules(category = null) {
    const rules = this._cache.rules;
    if (!rules || rules.length === 0) {
      throw new Error(
        'Pricing configuration error: No active pricing rules loaded from database. Ensure pricing_rules table is populated and database connection is active.'
      );
    }
    if (category) {
      const filtered = rules.filter(r => r.category === category);
      if (filtered.length === 0) {
        throw new Error(`Pricing configuration error: No active pricing rules found for category "${category}".`);
      }
      return filtered;
    }
    return rules;
  }

  /**
   * Synchronously get cached plan or throw controlled configuration error
   * @param {string} planName
   * @returns {Object}
   */
  getCachedPlan(planName) {
    const plans = this._cache.plans;
    if (!plans || Object.keys(plans).length === 0) {
      throw new Error(
        'Plan configuration error: No plans loaded from database. Ensure plans table is populated and database connection is active.'
      );
    }
    const plan = plans[planName];
    if (!plan) {
      throw new Error(`Plan configuration error: Plan "${planName}" not found in database.`);
    }
    return plan;
  }

  /**
   * Get plan by name (alias for getCachedPlan)
   * @param {string} planName 
   * @returns {Object}
   */
  getPlan(planName) {
    return this.getCachedPlan(planName);
  }

  /**
   * Helper to resolve unit multiplier from rule record
   * @param {Object} rule 
   * @returns {number}
   */
  getUnitMultiplier(rule) {
    if (rule.unit_multiplier != null && !isNaN(rule.unit_multiplier) && Number(rule.unit_multiplier) > 0) {
      return Number(rule.unit_multiplier);
    }
    if (rule.billing_unit != null && !isNaN(rule.billing_unit) && Number(rule.billing_unit) > 0) {
      return Number(rule.billing_unit);
    }
    return 1.0;
  }

  /**
   * Manually prime/inject rules and plans into memory (used for tests or bootstrap)
   * @param {Array<Object>} rules 
   * @param {Object|Array<Object>} [plans]
   */
  setInMemoryConfig(rules, plans = null) {
    this.validatePricingRules(rules);
    this._cache.rules = rules;
    if (plans) {
      if (Array.isArray(plans)) {
        const plansMap = {};
        for (const p of plans) {
          plansMap[p.name] = { ...p };
        }
        this._cache.plans = plansMap;
      } else {
        this._cache.plans = plans;
      }
    }
    this._cache.lastFetched = Date.now();
  }

  /**
   * Calculate API call cost using database pricing rules
   * Supports tiered boundaries (tier_1, tier_2, tier_3) or flat rates
   * 
   * @param {number} quantity - Number of API calls
   * @param {Array<Object>} [rules] - Optional explicit rules array
   * @returns {number} Cost in integer cents
   */
  calculateAPICallCost(quantity, rules = null) {
    if (quantity == null || isNaN(quantity)) {
      throw new Error(`Invalid API call quantity: ${quantity}`);
    }
    const qty = parseInt(quantity, 10);
    if (qty <= 0) return 0;

    const activeRules = rules ? rules.filter(r => r.category === 'api_call') : this.getCachedRules('api_call');
    if (!activeRules || activeRules.length === 0) {
      throw new Error('Pricing configuration error: No active pricing rules found for "api_call".');
    }

    const sortedTiers = [...activeRules].sort((a, b) => (Number(a.tier_min_units) || 0) - (Number(b.tier_min_units) || 0));

    // If single tier with unbounded upper limit
    if (sortedTiers.length === 1 && sortedTiers[0].tier_max_units == null) {
      const tier = sortedTiers[0];
      const rate = Number(tier.rate_cents);
      const divisor = this.getUnitMultiplier(tier);
      return Math.round((qty * rate) / divisor);
    }

    let totalCents = 0;
    for (const tier of sortedTiers) {
      const min = Number(tier.tier_min_units) || 0;
      const max = tier.tier_max_units != null ? Number(tier.tier_max_units) : Infinity;

      if (qty > min) {
        const unitsInTier = Math.max(0, Math.min(qty, max) - min);
        if (unitsInTier > 0) {
          const rate = Number(tier.rate_cents);
          const divisor = this.getUnitMultiplier(tier);
          totalCents += (unitsInTier * rate) / divisor;
        }
      }
    }

    return Math.round(totalCents);
  }

  /**
   * Normalize token type to match database rule keys
   * @param {string} tokenType 
   * @returns {string}
   */
  normalizeTokenType(tokenType) {
    if (!tokenType || typeof tokenType !== 'string') return '';
    const clean = tokenType.trim().toLowerCase();
    if (clean === 'input_tokens' || clean === 'input') return 'input';
    if (clean === 'cached_input_tokens' || clean === 'cached_input' || clean === 'cached_tokens') return 'cached_input';
    if (clean === 'output_tokens' || clean === 'output') return 'output';
    if (clean === 'reasoning_tokens' || clean === 'reasoning') return 'reasoning';
    return clean;
  }

  /**
   * Find AI token rule from active rules
   * @param {string} tokenType 
   * @param {Array<Object>} [rules]
   * @returns {Object}
   */
  findTokenRule(tokenType, rules = null) {
    const normalized = this.normalizeTokenType(tokenType);
    const activeRules = rules ? rules.filter(r => r.category === 'ai_token') : this.getCachedRules('ai_token');

    const rule = activeRules.find(r => {
      const key = this.normalizeTokenType(r.rule_key);
      return key === normalized;
    });

    if (!rule) {
      throw new Error(`Unknown token type: ${tokenType}. Ensure pricing_rules contains active rule for "${normalized}".`);
    }

    return rule;
  }

  /**
   * Calculate cost for AI tokens based on type and quantity
   * @param {string} tokenType - 'input', 'cached_input', 'output', 'reasoning' (or '_tokens' variants)
   * @param {number} quantity - Number of tokens
   * @param {Object} [options] - { exact: boolean }
   * @param {Array<Object>} [rules] - Optional explicit rules array
   * @returns {number} Cost in cents
   */
  calculateTokenCost(tokenType, quantity, options = {}, rules = null) {
    if (quantity == null || isNaN(quantity)) {
      throw new Error(`Invalid token quantity: ${quantity}`);
    }
    const qty = parseInt(quantity, 10);
    if (qty <= 0) return 0;

    const rule = this.findTokenRule(tokenType, rules);
    const rate = Number(rule.rate_cents);
    const divisor = this.getUnitMultiplier(rule);
    const exactCents = (qty * rate) / divisor;

    if (options.exact) {
      return exactCents;
    }
    return Math.round(exactCents);
  }

  /**
   * Calculate cost for AI tokens in integer micro-cents (1 cent = 10,000 micro-cents)
   * @param {string} tokenType 
   * @param {number} quantity 
   * @param {Array<Object>} [rules] 
   * @returns {number}
   */
  calculateTokenCostMicroCents(tokenType, quantity, rules = null) {
    const qty = parseInt(quantity, 10) || 0;
    if (qty <= 0) return 0;
    const rule = this.findTokenRule(tokenType, rules);
    const rate = Number(rule.rate_cents);
    const divisor = this.getUnitMultiplier(rule);
    return Math.round((qty * rate * 10000) / divisor);
  }

  /**
   * Calculate total cost for AI token usage with exact sub-cent accumulation
   * @param {Object} tokenUsage - Object with token counts by type
   * @param {Object} [options] - { exact: boolean }
   * @param {Array<Object>} [rules] - Optional explicit rules array
   * @returns {number} Total cost in cents
   */
  calculateAITokenCost(tokenUsage, options = {}, rules = null) {
    if (!tokenUsage || typeof tokenUsage !== 'object') {
      return 0;
    }

    let totalExactCents = 0;

    if (tokenUsage.input_tokens || tokenUsage.input) {
      const qty = tokenUsage.input_tokens || tokenUsage.input || 0;
      totalExactCents += this.calculateTokenCost('input', qty, { exact: true }, rules);
    }

    if (tokenUsage.cached_input_tokens || tokenUsage.cached_input || tokenUsage.cached_tokens) {
      const qty = tokenUsage.cached_input_tokens || tokenUsage.cached_input || tokenUsage.cached_tokens || 0;
      totalExactCents += this.calculateTokenCost('cached_input', qty, { exact: true }, rules);
    }

    if (tokenUsage.output_tokens || tokenUsage.output) {
      const qty = tokenUsage.output_tokens || tokenUsage.output || 0;
      totalExactCents += this.calculateTokenCost('output', qty, { exact: true }, rules);
    }

    if (tokenUsage.reasoning_tokens || tokenUsage.reasoning) {
      const qty = tokenUsage.reasoning_tokens || tokenUsage.reasoning || 0;
      totalExactCents += this.calculateTokenCost('reasoning', qty, { exact: true }, rules);
    }

    if (options.exact) {
      return totalExactCents;
    }
    return Math.round(totalExactCents);
  }

  /**
   * Calculate total cost for AI token usage in integer micro-cents
   * @param {Object} tokenUsage 
   * @param {Array<Object>} [rules] 
   * @returns {number}
   */
  calculateAITokenCostMicroCents(tokenUsage, rules = null) {
    if (!tokenUsage || typeof tokenUsage !== 'object') {
      return 0;
    }

    let totalMicroCents = 0;

    if (tokenUsage.input_tokens || tokenUsage.input) {
      const qty = tokenUsage.input_tokens || tokenUsage.input || 0;
      totalMicroCents += this.calculateTokenCostMicroCents('input', qty, rules);
    }

    if (tokenUsage.cached_input_tokens || tokenUsage.cached_input || tokenUsage.cached_tokens) {
      const qty = tokenUsage.cached_input_tokens || tokenUsage.cached_input || tokenUsage.cached_tokens || 0;
      totalMicroCents += this.calculateTokenCostMicroCents('cached_input', qty, rules);
    }

    if (tokenUsage.output_tokens || tokenUsage.output) {
      const qty = tokenUsage.output_tokens || tokenUsage.output || 0;
      totalMicroCents += this.calculateTokenCostMicroCents('output', qty, rules);
    }

    if (tokenUsage.reasoning_tokens || tokenUsage.reasoning) {
      const qty = tokenUsage.reasoning_tokens || tokenUsage.reasoning || 0;
      totalMicroCents += this.calculateTokenCostMicroCents('reasoning', qty, rules);
    }

    return totalMicroCents;
  }
}

const pricingService = new PricingService();
pricingService.PricingService = PricingService;
module.exports = pricingService;
