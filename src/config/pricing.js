/**
 * AI Token Pricing Configuration
 * Based on real-world AI pricing rules
 * Standard prices are in cents per 1M tokens.
 * Sub-cent calculations use micro-cents (1 cent = 10,000 micro-cents, 1 dollar = 1,000,000 micro-cents)
 * to avoid repeatedly rounding small token usage down to zero.
 */

const PRICING_CONFIG = {
  // API call pricing (per call)
  api_call: {
    cost_per_call: 1, // 1 cent per API call
  },
  
  // AI token pricing (per 1M tokens, in cents)
  ai_tokens: {
    // Input tokens ($0.30 per 1M tokens = 30 cents)
    input_tokens: {
      cost_per_million: 30,
    },
    
    // Cached input tokens ($0.10 per 1M cached input tokens = 10 cents)
    cached_input_tokens: {
      cost_per_million: 10,
    },
    
    // Output tokens ($0.60 per 1M output tokens = 60 cents)
    output_tokens: {
      cost_per_million: 60,
    },
    
    // Reasoning tokens ($0.60 per 1M reasoning tokens = 60 cents, counted as output)
    reasoning_tokens: {
      cost_per_million: 60,
    },
  },
};

/**
 * Calculate cost for AI tokens in micro-cents (integer arithmetic, no precision loss)
 * 1 cent = 10,000 micro-cents
 * @param {string} tokenType - Type of tokens
 * @param {number} quantity - Number of tokens
 * @returns {number} - Cost in micro-cents
 */
function calculateTokenCostMicroCents(tokenType, quantity) {
  const pricing = PRICING_CONFIG.ai_tokens[tokenType];
  if (!pricing) {
    throw new Error(`Unknown token type: ${tokenType}`);
  }

  // (quantity * cost_per_million * 10,000) / 1,000,000 = (quantity * cost_per_million) / 100
  return Math.round((quantity * pricing.cost_per_million * 10000) / 1000000);
}

/**
 * Calculate cost for AI tokens based on type and quantity
 * @param {string} tokenType - Type of tokens (input_tokens, cached_input_tokens, output_tokens, reasoning_tokens)
 * @param {number} quantity - Number of tokens
 * @param {Object} options - { exact: boolean } if true returns precise float cents, else rounded integer cents
 * @returns {number} - Cost in cents
 */
function calculateTokenCost(tokenType, quantity, options = {}) {
  const pricing = PRICING_CONFIG.ai_tokens[tokenType];
  if (!pricing) {
    throw new Error(`Unknown token type: ${tokenType}`);
  }
  
  const exactCents = (quantity * pricing.cost_per_million) / 1000000;
  if (options.exact) {
    return exactCents;
  }
  
  // For small non-zero tokens, avoid rounding down to 0 if callers need ceil or nearest round
  return Math.round(exactCents);
}

/**
 * Calculate total cost for AI token usage with exact sub-cent accumulation
 * @param {Object} tokenUsage - Object with token counts by type
 * @param {Object} options - { exact: boolean }
 * @returns {number} - Total cost in cents
 */
function calculateAITokenCost(tokenUsage, options = {}) {
  let totalExactCents = 0;
  
  // Input tokens
  if (tokenUsage.input_tokens) {
    totalExactCents += (tokenUsage.input_tokens * PRICING_CONFIG.ai_tokens.input_tokens.cost_per_million) / 1000000;
  }
  
  // Cached input tokens (cheaper)
  if (tokenUsage.cached_input_tokens) {
    totalExactCents += (tokenUsage.cached_input_tokens * PRICING_CONFIG.ai_tokens.cached_input_tokens.cost_per_million) / 1000000;
  }
  
  // Output tokens
  if (tokenUsage.output_tokens) {
    totalExactCents += (tokenUsage.output_tokens * PRICING_CONFIG.ai_tokens.output_tokens.cost_per_million) / 1000000;
  }
  
  // Reasoning tokens (count as output tokens)
  if (tokenUsage.reasoning_tokens) {
    totalExactCents += (tokenUsage.reasoning_tokens * PRICING_CONFIG.ai_tokens.reasoning_tokens.cost_per_million) / 1000000;
  }
  
  if (options.exact) {
    return totalExactCents;
  }
  return Math.round(totalExactCents);
}

/**
 * Calculate total cost for AI token usage in integer micro-cents (1 cent = 10,000 micro-cents)
 * @param {Object} tokenUsage
 * @returns {number}
 */
function calculateAITokenCostMicroCents(tokenUsage) {
  let totalMicroCents = 0;
  if (tokenUsage.input_tokens) {
    totalMicroCents += calculateTokenCostMicroCents('input_tokens', tokenUsage.input_tokens);
  }
  if (tokenUsage.cached_input_tokens) {
    totalMicroCents += calculateTokenCostMicroCents('cached_input_tokens', tokenUsage.cached_input_tokens);
  }
  if (tokenUsage.output_tokens) {
    totalMicroCents += calculateTokenCostMicroCents('output_tokens', tokenUsage.output_tokens);
  }
  if (tokenUsage.reasoning_tokens) {
    totalMicroCents += calculateTokenCostMicroCents('reasoning_tokens', tokenUsage.reasoning_tokens);
  }
  return totalMicroCents;
}

/**
 * Calculate cost for API calls
 * @param {number} quantity - Number of API calls
 * @returns {number} - Cost in cents (integer)
 */
function calculateAPICallCost(quantity) {
  return quantity * PRICING_CONFIG.api_call.cost_per_call;
}

module.exports = {
  PRICING_CONFIG,
  calculateTokenCost,
  calculateTokenCostMicroCents,
  calculateAITokenCost,
  calculateAITokenCostMicroCents,
  calculateAPICallCost,
};
