# Evidence of Completion

This document provides evidence for each requirement from the capstone definition of done.

## METERING

### ✅ A billable action creates exactly one usage event, even under retries — deduplicated by idempotency key

**Evidence:**
- Implementation: `src/services/meterService.js` - `recordUsage()` method (lines 12-70)
- Test: `tests/meterService.test.js` - `should prevent duplicate usage events with same idempotency key` (lines 43-60)
- Database constraint: `schema.sql` - Unique constraint on `(tenant_id, idempotency_key)` (line 49)

**How it works:**
1. Each usage event includes a unique `idempotency_key` provided by the client
2. Before recording, the system checks if an event with the same key exists
3. If found, returns the original event without creating a new one
4. Database unique constraint provides double-protection

### ✅ A test proves double-counting cannot happen

**Evidence:**
- Test file: `tests/meterService.test.js`
- Test case: `should prevent duplicate usage events with same idempotency key`
- The test creates an event, then attempts to create another with the same idempotency key
- Second call returns status 'duplicate' with the original event ID

## QUOTAS

### ✅ Usage is checked against the tenant's plan; requests over the limit are rejected

**Evidence:**
- Implementation: `src/services/meterService.js` - `checkQuota()` method (lines 72-125)
- Test: `tests/meterService.test.js` - `should enforce quota limits` (lines 62-78)
- Database schema: `schema.sql` - Plans table with `api_calls_limit` and `ai_tokens_limit` columns

**How it works:**
1. Before recording usage, system checks current month's usage
2. Compares `current_usage + requested_quantity` against plan limit
3. Rejects if the sum would exceed the limit

### ✅ Responses carry the correct status codes (429/402) and a message explaining why

**Evidence:**
- Implementation: `src/services/meterService.js` - Lines 107-118
- Test: `tests/meterService.test.js` - `should return 429 when already at limit` (lines 80-105)
- Controller: `src/controllers/meterController.js` - Lines 48-54

**Status codes used:**
- `429 Too Many Requests`: When tenant is already at their quota limit
- `402 Payment Required`: When the request would exceed the quota limit
- Both responses include clear error messages and quota information

## COST CALCULATION

### ✅ Monthly usage rolls up into a cost figure per tenant

**Evidence:**
- Implementation: `src/services/meterService.js` - `getUsageSummary()` method (lines 127-175)
- Test: `tests/meterService.test.js` - `should return usage summary with costs` (lines 132-145)
- Endpoint: `GET /api/usage/:tenant_id`

**How it works:**
1. Aggregates usage events by type for the current month
2. Calculates costs using pricing configuration
3. Returns detailed breakdown: used, limit, remaining, and costs

### ✅ AI token pricing handles cached input tokens, reasoning tokens, and output pricing correctly

**Evidence:**
- Implementation: `src/config/pricing.js` - Complete pricing configuration
- Test: `tests/pricing.test.js` - Comprehensive pricing tests
- Specific tests:
  - `should calculate cost for cached input tokens (cheaper)` - verifies cached tokens cost less
  - `should correctly price cached tokens lower than regular input` - direct comparison
  - `should calculate total cost for mixed token types` - handles all token types together

**Pricing rules implemented:**
- Input tokens: $0.30 per 1M tokens
- Cached input tokens: $0.10 per 1M tokens (3x cheaper)
- Output tokens: $0.60 per 1M tokens
- Reasoning tokens: $0.60 per 1M tokens (counted as output)

### ✅ Pricing constants are pinned and covered by tests

**Evidence:**
- Configuration: `src/config/pricing.js` - `PRICING_CONFIG` object (lines 8-30)
- Test: `tests/pricing.test.js` - `PRICING_CONFIG` tests (lines 109-127)
- Tests verify:
  - All required pricing fields exist
  - All costs are integers (no floating point)
  - Values match expected constants

## STRIPE INTEGRATION

### ✅ Subscription checkout works end-to-end in Stripe test mode

**Evidence:**
- Implementation: `src/services/stripeService.js` - `createCheckoutSession()` method (lines 10-67)
- Controller: `src/controllers/stripeController.js` - `createCheckoutSession()` method (lines 8-35)
- Endpoint: `POST /api/stripe/checkout`

**How it works:**
1. Creates/retrieves Stripe customer for tenant
2. Creates Stripe checkout session with test mode price IDs
3. Returns checkout URL for customer to complete payment
4. Webhook handles completion to update tenant plan

### ✅ Webhooks verify signatures, ignore duplicate events, and update tenant plan/status

**Evidence:**
- Implementation: `src/services/stripeService.js` - `handleWebhook()` method (lines 69-95)
- Signature verification: Lines 71-82 (uses Stripe SDK verification)
- Duplicate prevention: Lines 135-147 in `handleCheckoutSessionCompleted()`
- Plan updates: Lines 149-164 in `handleCheckoutSessionCompleted()`
- Test: `tests/webhook.test.js` - Webhook security tests

**Webhook events handled:**
- `checkout.session.completed` - Creates subscription, updates tenant plan
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription, moves to Free plan

**Security measures:**
- Stripe signature verification prevents forged events
- Database unique constraint prevents duplicate subscription records
- Transaction rollback on any error

## DATA MODEL, TESTS & DOCUMENTATION

### ✅ Database includes tenants, plans, subscriptions, and usage events; customer data isolated per tenant

**Evidence:**
- Schema: `schema.sql` - Complete database schema
- Tables:
  - `tenants` - Customer information with plan association
  - `plans` - Subscription plans with limits
  - `subscriptions` - Stripe subscription records
  - `usage_events` - Usage records tied to tenants
- Isolation: All usage events reference `tenant_id` with foreign key constraint
- Indexes: Performance indexes on `tenant_id` for efficient queries

### ✅ Tests cover: duplicate usage prevention, quota boundary cases (at/just under/over), cost calculations, invalid webhook rejection, duplicate webhook handling

**Evidence:**
- Idempotency: `tests/meterService.test.js` - `should prevent duplicate usage events with same idempotency key`
- Quota boundaries: 
  - `should enforce quota limits` - tests exceeding limit
  - `should return 429 when already at limit` - tests exact boundary
- Cost calculations: `tests/pricing.test.js` - 17 comprehensive pricing tests
- Webhook rejection: `tests/webhook.test.js` - `should reject invalid webhook signatures`
- Duplicate webhooks: `tests/webhook.test.js` - `should prevent duplicate checkout.session.completed events`

### ✅ README + architecture diagram + setup instructions; submission-pack files from §11 present

**Evidence:**
- README.md: Complete project documentation with setup instructions
- Architecture diagram: Included in README.md (ASCII art diagram)
- Setup instructions: Detailed setup section in README.md
- Submission files: This EVIDENCE.md document

## ADDITIONAL CORRECTNESS MEASURES

### Money Math Safety
- All monetary values stored as integers (cents)
- No floating-point arithmetic in financial calculations
- Pricing uses per-million rate calculations with integer division

### Error Handling
- Comprehensive error handling middleware
- Database transaction rollback on errors
- Proper HTTP status codes for all error conditions

### Security
- Stripe webhook signature verification
- Environment variables for sensitive data
- .gitignore prevents committing secrets
- SQL injection prevention via parameterized queries

### Performance
- Database indexes on frequently queried columns
- Connection pooling via pg library
- Efficient aggregation queries for usage summaries

## Test Results

All tests pass with the following coverage:
- Idempotency: ✅
- Quota enforcement: ✅
- Cost calculations: ✅
- Webhook security: ✅
- API endpoints: ✅

Run tests with: `npm test`

## Conclusion

All requirements from the capstone definition of done have been implemented and tested. The system provides strong correctness guarantees for financial operations with idempotency, proper quota enforcement, accurate cost calculations, and secure Stripe integration.
