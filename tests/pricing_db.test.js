const { PricingService } = require('../src/services/pricingService');

describe('Database-Driven Pricing & Quota System (DB Integration)', () => {
  let mockDbRules;
  let mockDbPlans;
  let mockPool;
  let pricingService;

  beforeEach(() => {
    // Simulated active database state
    mockDbRules = [
      {
        id: 'rule-api-1',
        category: 'api_call',
        rule_key: 'tier_1',
        name: 'API Calls (0 - 10k)',
        rate_cents: '500.000000',
        billing_unit: 'per_1k_units',
        unit_multiplier: '1000.00',
        tier_min_units: '0',
        tier_max_units: '10000',
        currency: 'usd',
        is_active: true
      },
      {
        id: 'rule-api-2',
        category: 'api_call',
        rule_key: 'tier_2',
        name: 'API Calls (10k - 100k)',
        rate_cents: '300.000000',
        billing_unit: 'per_1k_units',
        unit_multiplier: '1000.00',
        tier_min_units: '10000',
        tier_max_units: '100000',
        currency: 'usd',
        is_active: true
      },
      {
        id: 'rule-api-3',
        category: 'api_call',
        rule_key: 'tier_3',
        name: 'API Calls (> 100k)',
        rate_cents: '150.000000',
        billing_unit: 'per_1k_units',
        unit_multiplier: '1000.00',
        tier_min_units: '100000',
        tier_max_units: null,
        currency: 'usd',
        is_active: true
      },
      {
        id: 'rule-ai-1',
        category: 'ai_token',
        rule_key: 'input',
        name: 'AI Input Tokens',
        rate_cents: '15.000000',
        billing_unit: 'per_1m_tokens',
        unit_multiplier: '1000000.00',
        tier_min_units: '0',
        tier_max_units: null,
        currency: 'usd',
        is_active: true
      },
      {
        id: 'rule-ai-2',
        category: 'ai_token',
        rule_key: 'cached_input',
        name: 'AI Cached Input Tokens',
        rate_cents: '7.500000',
        billing_unit: 'per_1m_tokens',
        unit_multiplier: '1000000.00',
        tier_min_units: '0',
        tier_max_units: null,
        currency: 'usd',
        is_active: true
      },
      {
        id: 'rule-ai-3',
        category: 'ai_token',
        rule_key: 'output',
        name: 'AI Output Tokens',
        rate_cents: '60.000000',
        billing_unit: 'per_1m_tokens',
        unit_multiplier: '1000000.00',
        tier_min_units: '0',
        tier_max_units: null,
        currency: 'usd',
        is_active: true
      },
      {
        id: 'rule-ai-4',
        category: 'ai_token',
        rule_key: 'reasoning',
        name: 'AI Reasoning Tokens',
        rate_cents: '60.000000',
        billing_unit: 'per_1m_tokens',
        unit_multiplier: '1000000.00',
        tier_min_units: '0',
        tier_max_units: null,
        currency: 'usd',
        is_active: true
      }
    ];

    mockDbPlans = [
      {
        id: 1,
        name: 'Free',
        api_calls_limit: 1000,
        ai_tokens_limit: 100000,
        allow_overage: false,
        base_price_cents: 0
      },
      {
        id: 2,
        name: 'Pro',
        api_calls_limit: 10000,
        ai_tokens_limit: 1000000,
        allow_overage: true,
        base_price_cents: 4900
      },
      {
        id: 3,
        name: 'Enterprise',
        api_calls_limit: 1000000,
        ai_tokens_limit: 50000000,
        allow_overage: true,
        base_price_cents: 49900
      }
    ];

    mockPool = {
      query: jest.fn().mockImplementation(async (sql, params) => {
        if (sql.includes('FROM pricing_rules')) {
          return { rows: [...mockDbRules] };
        }
        if (sql.includes('FROM plans')) {
          return { rows: [...mockDbPlans] };
        }
        return { rows: [] };
      })
    };

    // Instantiate fresh pricing service with 0ms TTL for testing dynamic refresh
    pricingService = new PricingService({ cacheTtlMs: 0 });
  });

  it('should load initial rules and plans from the database pool', async () => {
    const rules = await pricingService.loadPricingRules(mockPool);
    const plans = await pricingService.loadPlans(mockPool);

    expect(rules.length).toBe(7);
    expect(Object.keys(plans).length).toBe(3);

    // Initial input token cost: 1M @ 15 = 15 cents
    const cost1 = pricingService.calculateTokenCost('input', 1000000);
    expect(cost1).toBe(15);
  });

  it('should dynamically update calculations when database pricing rules change without restart', async () => {
    await pricingService.loadPricingRules(mockPool);

    // Before change: output is 60 cents per 1M
    expect(pricingService.calculateTokenCost('output', 1000000)).toBe(60);

    // Directly update database record for output tokens to 90 cents per 1M
    const outputRule = mockDbRules.find(r => r.rule_key === 'output');
    outputRule.rate_cents = '90.000000';

    // Invalidate or reload cache from DB
    pricingService.invalidateCache();
    await pricingService.loadPricingRules(mockPool);

    // After change: immediately calculates with new rate
    expect(pricingService.calculateTokenCost('output', 1000000)).toBe(90);
  });

  it('should dynamically reflect changes to plan quotas from the database', async () => {
    await pricingService.loadPlans(mockPool);

    const proPlanBefore = pricingService.getPlan('Pro');
    expect(proPlanBefore.api_calls_limit).toBe(10000);

    // Update Pro plan quota in the database
    const proPlanDb = mockDbPlans.find(p => p.name === 'Pro');
    proPlanDb.api_calls_limit = 25000;
    proPlanDb.ai_tokens_limit = 5000000;

    pricingService.invalidateCache();
    await pricingService.loadPlans(mockPool);

    const proPlanAfter = pricingService.getPlan('Pro');
    expect(proPlanAfter.api_calls_limit).toBe(25000);
    expect(proPlanAfter.ai_tokens_limit).toBe(5000000);
  });

  it('should throw a controlled configuration error when the database has zero active rules', async () => {
    mockDbRules = []; // Database is empty or unpopulated

    await expect(pricingService.loadPricingRules(mockPool)).rejects.toThrow(
      /Pricing configuration error: No active pricing rules found in database/
    );
  });

  it('should correctly calculate tiered API calls across custom database tiers', async () => {
    await pricingService.loadPricingRules(mockPool);

    // Tier 1: 0 - 10,000 calls @ 500c / 1k = 5,000 cents
    // Tier 2: 10,001 - 100,000 calls @ 300c / 1k: 20,000 calls @ 300c / 1k = 6,000 cents
    // Total for 30,000 calls = 11,000 cents ($110.00)
    const cost = pricingService.calculateAPICallCost(30000);
    expect(cost).toBe(11000);
  });
});
