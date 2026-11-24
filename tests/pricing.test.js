const pricingService = require('../src/services/pricingService');
const {
  calculateTokenCost,
  calculateAITokenCost,
  calculateAPICallCost,
  PRICING_CONFIG
} = require('../src/config/pricing');

describe('Pricing Configuration & Calculations', () => {
  const standardTestRules = [
    {
      category: 'api_call',
      rule_key: 'tier_1',
      name: 'API Calls Tier 1',
      rate_cents: 500,
      billing_unit: 'per_1k_units',
      unit_multiplier: 1000,
      tier_min_units: 0,
      tier_max_units: 10000,
      is_active: true
    },
    {
      category: 'api_call',
      rule_key: 'tier_2',
      name: 'API Calls Tier 2',
      rate_cents: 300,
      billing_unit: 'per_1k_units',
      unit_multiplier: 1000,
      tier_min_units: 10000,
      tier_max_units: 100000,
      is_active: true
    },
    {
      category: 'api_call',
      rule_key: 'tier_3',
      name: 'API Calls Tier 3',
      rate_cents: 150,
      billing_unit: 'per_1k_units',
      unit_multiplier: 1000,
      tier_min_units: 100000,
      tier_max_units: null,
      is_active: true
    },
    {
      category: 'ai_token',
      rule_key: 'input',
      name: 'AI Input Tokens',
      rate_cents: 15.0,
      billing_unit: 'per_1m_tokens',
      unit_multiplier: 1000000,
      tier_min_units: 0,
      tier_max_units: null,
      is_active: true
    },
    {
      category: 'ai_token',
      rule_key: 'cached_input',
      name: 'AI Cached Input Tokens',
      rate_cents: 7.5,
      billing_unit: 'per_1m_tokens',
      unit_multiplier: 1000000,
      tier_min_units: 0,
      tier_max_units: null,
      is_active: true
    },
    {
      category: 'ai_token',
      rule_key: 'output',
      name: 'AI Output Tokens',
      rate_cents: 60.0,
      billing_unit: 'per_1m_tokens',
      unit_multiplier: 1000000,
      tier_min_units: 0,
      tier_max_units: null,
      is_active: true
    },
    {
      category: 'ai_token',
      rule_key: 'reasoning',
      name: 'AI Reasoning Tokens',
      rate_cents: 60.0,
      billing_unit: 'per_1m_tokens',
      unit_multiplier: 1000000,
      tier_min_units: 0,
      tier_max_units: null,
      is_active: true
    }
  ];

  const standardTestPlans = [
    {
      name: 'Free',
      api_calls_limit: 1000,
      ai_tokens_limit: 100000,
      allow_overage: false,
      base_price_cents: 0
    },
    {
      name: 'Pro',
      api_calls_limit: 10000,
      ai_tokens_limit: 1000000,
      allow_overage: true,
      base_price_cents: 4900
    },
    {
      name: 'Enterprise',
      api_calls_limit: 1000000,
      ai_tokens_limit: 50000000,
      allow_overage: true,
      base_price_cents: 49900
    }
  ];

  beforeEach(() => {
    pricingService.setInMemoryConfig(standardTestRules, standardTestPlans);
  });

  describe('Controlled Error Handling on Missing Rules', () => {
    it('should throw controlled configuration error when no rules are configured', () => {
      pricingService.invalidateCache();
      expect(() => {
        calculateTokenCost('input', 1000);
      }).toThrow(/Pricing configuration error: No active pricing rules loaded from database/);
    });
  });

  describe('calculateTokenCost', () => {
    it('should calculate cost for input tokens based on database rules (15 cents per 1M)', () => {
      const cost = calculateTokenCost('input', 1000000);
      expect(cost).toBe(15);
    });

    it('should calculate cost for cached input tokens based on database rules (7.5 cents per 1M)', () => {
      // 1M * 7.5 / 1M = 7.5 -> rounded to 8 for whole cents, or exact 7.5
      const cost = calculateTokenCost('cached_input', 1000000);
      expect(cost).toBe(8);

      const exactCost = calculateTokenCost('cached_input', 1000000, { exact: true });
      expect(exactCost).toBe(7.5);
    });

    it('should calculate cost for output tokens based on database rules (60 cents per 1M)', () => {
      const cost = calculateTokenCost('output', 1000000);
      expect(cost).toBe(60);
    });

    it('should calculate cost for reasoning tokens based on database rules (60 cents per 1M)', () => {
      const cost = calculateTokenCost('reasoning', 1000000);
      expect(cost).toBe(60);
    });

    it('should handle partial millions correctly', () => {
      const cost = calculateTokenCost('input', 500000, { exact: true });
      expect(cost).toBe(7.5); // Half of 15 cents
    });

    it('should support legacy token type keys like input_tokens', () => {
      const cost = calculateTokenCost('input_tokens', 1000000);
      expect(cost).toBe(15);
    });

    it('should throw controlled error for unknown token type', () => {
      expect(() => {
        calculateTokenCost('unknown_type', 1000);
      }).toThrow('Unknown token type: unknown_type');
    });
  });

  describe('calculateAITokenCost', () => {
    it('should calculate total cost for mixed token types', () => {
      const tokenUsage = {
        input_tokens: 1000000,       // 1M @ 15 = 15
        cached_input_tokens: 2000000,// 2M @ 7.5 = 15
        output_tokens: 1000000,      // 1M @ 60 = 60
        reasoning_tokens: 500000     // 0.5M @ 60 = 30
      };

      const cost = calculateAITokenCost(tokenUsage);
      expect(cost).toBe(120); // 15 + 15 + 60 + 30 = 120 cents
    });

    it('should handle empty token usage gracefully', () => {
      expect(calculateAITokenCost({})).toBe(0);
      expect(calculateAITokenCost(null)).toBe(0);
    });

    it('should correctly price cached tokens lower than regular input tokens', () => {
      const regularCost = calculateAITokenCost({ input_tokens: 1000000 }, { exact: true });
      const cachedCost = calculateAITokenCost({ cached_input_tokens: 1000000 }, { exact: true });

      expect(cachedCost).toBeLessThan(regularCost);
      expect(regularCost).toBe(15);
      expect(cachedCost).toBe(7.5);
    });
  });

  describe('calculateAPICallCost (Tiered Pricing from DB)', () => {
    it('should calculate cost within Tier 1 (0 - 10k calls @ 500 cents per 1k = 0.5c/call)', () => {
      // 1000 calls * (500 / 1000) = 500 cents
      const cost = calculateAPICallCost(1000);
      expect(cost).toBe(500);
    });

    it('should handle zero calls', () => {
      expect(calculateAPICallCost(0)).toBe(0);
    });

    it('should calculate tiered cost across Tier 1 and Tier 2', () => {
      // 15,000 calls:
      // First 10,000 in Tier 1: 10,000 * (500 / 1000) = 5,000 cents
      // Next 5,000 in Tier 2: 5,000 * (300 / 1000) = 1,500 cents
      // Total = 6,500 cents ($65.00)
      const cost = calculateAPICallCost(15000);
      expect(cost).toBe(6500);
    });

    it('should calculate tiered cost spanning all 3 tiers', () => {
      // 150,000 calls:
      // Tier 1 (10,000 calls @ 500/1k): 5,000 cents
      // Tier 2 (90,000 calls @ 300/1k): 27,000 cents
      // Tier 3 (50,000 calls @ 150/1k): 7,500 cents
      // Total = 39,500 cents ($395.00)
      const cost = calculateAPICallCost(150000);
      expect(cost).toBe(39500);
    });
  });

  describe('PRICING_CONFIG Proxy compatibility', () => {
    it('should expose dynamic api_call and ai_tokens matching DB rules', () => {
      expect(PRICING_CONFIG).toBeDefined();
      expect(PRICING_CONFIG.ai_tokens.input_tokens.cost_per_million).toBe(15);
      expect(PRICING_CONFIG.ai_tokens.cached_input_tokens.cost_per_million).toBe(7.5);
      expect(PRICING_CONFIG.ai_tokens.output_tokens.cost_per_million).toBe(60);
      expect(PRICING_CONFIG.ai_tokens.reasoning_tokens.cost_per_million).toBe(60);
    });

    it('should expose dynamic plans from DB configuration', () => {
      expect(PRICING_CONFIG.plans).toBeDefined();
      expect(PRICING_CONFIG.plans.Free.api_calls_limit).toBe(1000);
      expect(PRICING_CONFIG.plans.Pro.api_calls_limit).toBe(10000);
      expect(PRICING_CONFIG.plans.Enterprise.base_price_cents).toBe(49900);
    });
  });
});
