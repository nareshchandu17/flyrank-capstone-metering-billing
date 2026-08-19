/**
 * AI Token Pricing Configuration
 * Based on real-world AI pricing rules
 * All prices are in micro-units (cents) to avoid floating point math
 */

const PRICING_CONFIG = {
  // API call pricing (per call)
  api_call: {
    cost_per_call: 1, // 1 cent per API call
  },
  
  // AI token pricing (per 1M tokens, in cents)
  ai_tokens: {
    // Input tokens
    input_tokens: {
      cost_per_million: 30, // $0.30 per 1M input tokens
    },
    
    // Cached input tokens (cheaper)
    cached_input_tokens: {
      cost_per_million: 10, // $0.10 per 1M cached input tokens
    },
    
    // Output tokens
    output_tokens: {
      cost_per_million: 60, // $0.60 per 1M output tokens
    },
    
    // Reasoning tokens (count as output tokens)
    reasoning_tokens: {
      cost_per_million: 60, // $0.60 per 1M reasoning tokens
    },
  },
};

/**
 * Calculate cost for AI tokens based on type and quantity
 * @param {string} tokenType - Type of tokens (input_tokens, cached_input_tokens, output_tokens, reasoning_tokens)
 * @param {number} quantity - Number of tokens
 * @returns {number} - Cost in cents (integer)
 */
function calculateTokenCost(tokenType, quantity) {
  const pricing = PRICING_CONFIG.ai_tokens[tokenType];
  if (!pricing) {
    throw new Error(`Unknown token type: ${tokenType}`);
  }
  
  // Calculate cost: (quantity / 1,000,000) * cost_per_million
  // Use integer math to avoid floating point issues
  const cost = Math.floor((quantity * pricing.cost_per_million) / 1000000);
  return cost;
}

/**
 * Calculate total cost for AI token usage
 * @param {Object} tokenUsage - Object with token counts by type
 * @returns {number} - Total cost in cents (integer)
 */
function calculateAITokenCost(tokenUsage) {
  let totalCost = 0;
  
  // Input tokens
  if (tokenUsage.input_tokens) {
    totalCost += calculateTokenCost('input_tokens', tokenUsage.input_tokens);
  }
  
  // Cached input tokens (cheaper)
  if (tokenUsage.cached_input_tokens) {
    totalCost += calculateTokenCost('cached_input_tokens', tokenUsage.cached_input_tokens);
  }
  
  // Output tokens
  if (tokenUsage.output_tokens) {
    totalCost += calculateTokenCost('output_tokens', tokenUsage.output_tokens);
  }
  
  // Reasoning tokens (count as output tokens)
  if (tokenUsage.reasoning_tokens) {
    totalCost += calculateTokenCost('reasoning_tokens', tokenUsage.reasoning_tokens);
  }
  
  return totalCost;
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
  calculateAITokenCost,
  calculateAPICallCost,
};
