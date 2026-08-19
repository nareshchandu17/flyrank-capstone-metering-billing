const meterService = require('../src/services/meterService');
const pool = require('../src/config/database');

// Simple UUID generator for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('MeterService', () => {
  let testTenantId;
  let testPlanId;
  
  beforeAll(async () => {
    // Clean up only our specific test data in correct order (children first)
    await pool.query('DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE email = $1)', ['test@example.com']);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id IN (SELECT id FROM tenants WHERE email = $1)', ['test@example.com']);
    await pool.query('DELETE FROM tenants WHERE email = $1', ['test@example.com']);
    await pool.query('DELETE FROM plans WHERE name = $1', ['Test Plan']);
    await pool.query('DELETE FROM plans WHERE name = $1', ['Small Plan 429']);
    
    // Create test plan
    const planResult = await pool.query(
      'INSERT INTO plans (name, api_calls_limit, ai_tokens_limit) VALUES ($1, $2, $3) RETURNING id',
      ['Test Plan', 100, 1000]
    );
    testPlanId = planResult.rows[0].id;
    
    // Create test tenant
    const tenantResult = await pool.query(
      'INSERT INTO tenants (name, email, plan_id) VALUES ($1, $2, $3) RETURNING id',
      ['Test Tenant', 'test@example.com', testPlanId]
    );
    testTenantId = tenantResult.rows[0].id;
  });
  
  afterAll(async () => {
    // Clean up only our specific test data in correct order (children first)
    await pool.query('DELETE FROM usage_events WHERE tenant_id IN (SELECT id FROM tenants WHERE email = $1)', ['test@example.com']);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id IN (SELECT id FROM tenants WHERE email = $1)', ['test@example.com']);
    await pool.query('DELETE FROM tenants WHERE email = $1', ['test@example.com']);
    await pool.query('DELETE FROM plans WHERE name = $1', ['Test Plan']);
    await pool.query('DELETE FROM plans WHERE name = $1', ['Small Plan 429']);
  });
  
  describe('recordUsage', () => {
    it('should record a new usage event', async () => {
      const idempotencyKey = generateUUID();
      const result = await meterService.recordUsage(
        testTenantId,
        'api_call',
        10,
        idempotencyKey
      );
      
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.quantity).toBe(10);
      expect(result.data.usage_type).toBe('api_call');
    });
    
    it('should prevent duplicate usage events with same idempotency key', async () => {
      const idempotencyKey = generateUUID();
      
      // First call
      const firstResult = await meterService.recordUsage(
        testTenantId,
        'api_call',
        5,
        idempotencyKey
      );
      
      expect(firstResult.status).toBe('success');
      
      // Second call with same idempotency key
      const secondResult = await meterService.recordUsage(
        testTenantId,
        'api_call',
        5,
        idempotencyKey
      );
      
      expect(secondResult.status).toBe('duplicate');
      expect(secondResult.data.id).toBe(firstResult.data.id);
    });
    
    it('should enforce quota limits', async () => {
      // First, clean up existing usage for this tenant
      await pool.query('DELETE FROM usage_events WHERE tenant_id = $1', [testTenantId]);
      
      // Record enough usage to reach near the limit
      const idempotencyKey1 = generateUUID();
      await meterService.recordUsage(
        testTenantId,
        'api_call',
        95, // 95 out of 100 limit
        idempotencyKey1
      );
      
      // Try to exceed limit
      const idempotencyKey2 = generateUUID();
      const result = await meterService.recordUsage(
        testTenantId,
        'api_call',
        10, // Would exceed limit (95 + 10 = 105 > 100)
        idempotencyKey2
      );
      
      expect(result.status).toBe('rejected');
      expect(result.statusCode).toBe(402);
      expect(result.quotaInfo).toBeDefined();
    });
    
    it('should return 429 when already at limit', async () => {
      // Create a new tenant with small limit
      const smallPlanResult = await pool.query(
        'INSERT INTO plans (name, api_calls_limit, ai_tokens_limit) VALUES ($1, $2, $3) RETURNING id',
        ['Small Plan 429', 5, 100]
      );
      const smallPlanId = smallPlanResult.rows[0].id;
      
      const smallTenantResult = await pool.query(
        'INSERT INTO tenants (name, email, plan_id) VALUES ($1, $2, $3) RETURNING id',
        ['Small Tenant 429', 'small429-test@example.com', smallPlanId]
      );
      const smallTenantId = smallTenantResult.rows[0].id;
      
      // Use up the entire limit
      await meterService.recordUsage(
        smallTenantId,
        'api_call',
        5,
        generateUUID()
      );
      
      // Try to use more
      const result = await meterService.recordUsage(
        smallTenantId,
        'api_call',
        1,
        generateUUID()
      );
      
      expect(result.status).toBe('rejected');
      expect(result.statusCode).toBe(429);
      
      // Cleanup in correct order
      await pool.query('DELETE FROM usage_events WHERE tenant_id = $1', [smallTenantId]);
      await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [smallTenantId]);
      await pool.query('DELETE FROM tenants WHERE id = $1', [smallTenantId]);
      // Don't delete the plan here, let afterAll handle it
    });
  });
  
  describe('getUsageSummary', () => {
    it('should return usage summary with costs', async () => {
      const summary = await meterService.getUsageSummary(testTenantId);
      
      expect(summary).toBeDefined();
      expect(summary.tenant).toBeDefined();
      expect(summary.usage).toBeDefined();
      expect(summary.costs).toBeDefined();
      expect(summary.usage.api_calls).toBeDefined();
      expect(summary.usage.ai_tokens).toBeDefined();
      expect(summary.costs.total_cents).toBeDefined();
    });
  });
});
