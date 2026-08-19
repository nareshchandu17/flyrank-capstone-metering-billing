const {
  calculateTokenCost,
  calculateAITokenCost,
  calculateAPICallCost,
  PRICING_CONFIG
} = require('../src/config/pricing');

describe('Pricing Configuration', () => {
  describe('calculateTokenCost', () => {
    it('should calculate cost for input tokens', () => {
      const cost = calculateTokenCost('input_tokens', 1000000);
      expect(cost).toBe(30); // $0.30 per 1M tokens
    });
    
    it('should calculate cost for cached input tokens (cheaper)', () => {
      const cost = calculateTokenCost('cached_input_tokens', 1000000);
      expect(cost).toBe(10); // $0.10 per 1M cached tokens
    });
    
    it('should calculate cost for output tokens', () => {
      const cost = calculateTokenCost('output_tokens', 1000000);
      expect(cost).toBe(60); // $0.60 per 1M output tokens
    });
    
    it('should calculate cost for reasoning tokens (same as output)', () => {
      const cost = calculateTokenCost('reasoning_tokens', 1000000);
      expect(cost).toBe(60); // $0.60 per 1M reasoning tokens
    });
    
    it('should handle partial millions correctly', () => {
      const cost = calculateTokenCost('input_tokens', 500000);
      expect(cost).toBe(15); // Half of $0.30
    });
    
    it('should throw error for unknown token type', () => {
      expect(() => {
        calculateTokenCost('unknown_type', 1000);
      }).toThrow('Unknown token type');
    });
  });
  
  describe('calculateAITokenCost', () => {
    it('should calculate total cost for mixed token types', () => {
      const tokenUsage = {
        input_tokens: 1000000,
        cached_input_tokens: 500000,
        output_tokens: 2000000,
        reasoning_tokens: 100000
      };
      
      const cost = calculateAITokenCost(tokenUsage);
      const expectedCost = 30 + 5 + 120 + 6; // 30 + 5 + 120 + 6 = 161 cents
      
      expect(cost).toBe(expectedCost);
    });
    
    it('should handle only input tokens', () => {
      const tokenUsage = {
        input_tokens: 2000000
      };
      
      const cost = calculateAITokenCost(tokenUsage);
      expect(cost).toBe(60); // 2M * $0.30 = $0.60
    });
    
    it('should handle only output tokens', () => {
      const tokenUsage = {
        output_tokens: 3000000
      };
      
      const cost = calculateAITokenCost(tokenUsage);
      expect(cost).toBe(180); // 3M * $0.60 = $1.80
    });
    
    it('should handle empty token usage', () => {
      const tokenUsage = {};
      const cost = calculateAITokenCost(tokenUsage);
      expect(cost).toBe(0);
    });
    
    it('should correctly price cached tokens lower than regular input', () => {
      const regularCost = calculateAITokenCost({ input_tokens: 1000000 });
      const cachedCost = calculateAITokenCost({ cached_input_tokens: 1000000 });
      
      expect(cachedCost).toBeLessThan(regularCost);
      expect(regularCost).toBe(30);
      expect(cachedCost).toBe(10);
    });
  });
  
  describe('calculateAPICallCost', () => {
    it('should calculate cost for API calls', () => {
      const cost = calculateAPICallCost(100);
      expect(cost).toBe(100); // 1 cent per call
    });
    
    it('should handle zero calls', () => {
      const cost = calculateAPICallCost(0);
      expect(cost).toBe(0);
    });
    
    it('should handle large numbers', () => {
      const cost = calculateAPICallCost(10000);
      expect(cost).toBe(10000); // 10000 cents = $100
    });
  });
  
  describe('PRICING_CONFIG', () => {
    it('should have all required pricing fields', () => {
      expect(PRICING_CONFIG).toBeDefined();
      expect(PRICING_CONFIG.api_call).toBeDefined();
      expect(PRICING_CONFIG.ai_tokens).toBeDefined();
      expect(PRICING_CONFIG.ai_tokens.input_tokens).toBeDefined();
      expect(PRICING_CONFIG.ai_tokens.cached_input_tokens).toBeDefined();
      expect(PRICING_CONFIG.ai_tokens.output_tokens).toBeDefined();
      expect(PRICING_CONFIG.ai_tokens.reasoning_tokens).toBeDefined();
    });
    
    it('should have integer costs to avoid floating point issues', () => {
      const checkInteger = (value) => Number.isInteger(value);
      
      expect(checkInteger(PRICING_CONFIG.api_call.cost_per_call)).toBe(true);
      expect(checkInteger(PRICING_CONFIG.ai_tokens.input_tokens.cost_per_million)).toBe(true);
      expect(checkInteger(PRICING_CONFIG.ai_tokens.cached_input_tokens.cost_per_million)).toBe(true);
      expect(checkInteger(PRICING_CONFIG.ai_tokens.output_tokens.cost_per_million)).toBe(true);
      expect(checkInteger(PRICING_CONFIG.ai_tokens.reasoning_tokens.cost_per_million)).toBe(true);
    });
  });
});
