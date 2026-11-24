/**
 * Database-Driven Pricing Configuration & Calculation Helpers
 * 
 * Rates and quotas are dynamically sourced from PostgreSQL via PricingService.
 * No hardcoded pricing constants or plan limits exist in runtime source code.
 */

const pricingService = require('../services/pricingService');

// Dynamic Proxy reflecting live database-backed pricing rules and plans
const PRICING_CONFIG = new Proxy({}, {
  get(target, prop) {
    if (prop === 'api_call') {
      const rules = pricingService.getCachedRules('api_call');
      const firstTier = rules[0] || { rate_cents: 1, unit_multiplier: 1 };
      const rate = Number(firstTier.rate_cents);
      const mult = pricingService.getUnitMultiplier(firstTier);
      return {
        cost_per_call: Math.round(rate / mult),
      };
    }

    if (prop === 'ai_tokens') {
      const getRatePerMillion = (key) => {
        const rule = pricingService.findTokenRule(key);
        const rate = Number(rule.rate_cents);
        const mult = pricingService.getUnitMultiplier(rule);
        return (rate * 1000000) / mult;
      };

      return {
        input_tokens: { cost_per_million: getRatePerMillion('input') },
        cached_input_tokens: { cost_per_million: getRatePerMillion('cached_input') },
        output_tokens: { cost_per_million: getRatePerMillion('output') },
        reasoning_tokens: { cost_per_million: getRatePerMillion('reasoning') },
      };
    }

    if (prop === 'plans') {
      return new Proxy({}, {
        get(_, planName) {
          if (typeof planName === 'string') {
            return pricingService.getCachedPlan(planName);
          }
          return undefined;
        }
      });
    }

    return undefined;
  }
});

/**
 * Calculate cost for AI tokens in micro-cents (1 cent = 10,000 micro-cents)
 */
function calculateTokenCostMicroCents(tokenType, quantity, rules = null) {
  return pricingService.calculateTokenCostMicroCents(tokenType, quantity, rules);
}

/**
 * Calculate cost for AI tokens based on type and quantity
 */
function calculateTokenCost(tokenType, quantity, options = {}, rules = null) {
  return pricingService.calculateTokenCost(tokenType, quantity, options, rules);
}

/**
 * Calculate total cost for AI token usage with exact sub-cent accumulation
 */
function calculateAITokenCost(tokenUsage, options = {}, rules = null) {
  return pricingService.calculateAITokenCost(tokenUsage, options, rules);
}

/**
 * Calculate total cost for AI token usage in integer micro-cents
 */
function calculateAITokenCostMicroCents(tokenUsage, rules = null) {
  return pricingService.calculateAITokenCostMicroCents(tokenUsage, rules);
}

/**
 * Calculate cost for API calls based on database tier rules
 */
function calculateAPICallCost(quantity, rules = null) {
  return pricingService.calculateAPICallCost(quantity, rules);
}

/**
 * Validate billing period format YYYY-MM
 * @param {string} periodString
 * @returns {boolean}
 */
function isValidBillingPeriod(periodString) {
  if (typeof periodString !== 'string') return false;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodString);
}

/**
 * Get UTC Date boundaries for a billing period string (e.g., '2026-10')
 * @param {string} [periodString] - 'YYYY-MM'
 * @returns {{ startDate: Date, endDate: Date, billingPeriod: string }}
 */
function getBillingPeriodDates(periodString) {
  let period = periodString;
  if (!period) {
    period = getCurrentBillingPeriod();
  }
  if (!isValidBillingPeriod(period)) {
    throw new Error(`Invalid billing period format: ${period}. Expected YYYY-MM`);
  }

  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed (1..12)

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return {
    startDate,
    endDate,
    billingPeriod: period,
  };
}

/**
 * Get current billing period string in UTC ('YYYY-MM')
 * @returns {string}
 */
function getCurrentBillingPeriod() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

module.exports = {
  PRICING_CONFIG,
  pricingService,
  calculateTokenCost,
  calculateTokenCostMicroCents,
  calculateAITokenCost,
  calculateAITokenCostMicroCents,
  calculateAPICallCost,
  isValidBillingPeriod,
  getBillingPeriodDates,
  getCurrentBillingPeriod,
};
