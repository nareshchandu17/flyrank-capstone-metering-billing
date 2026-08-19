# Usage Metering & Billing Engine

A production-grade backend service for SaaS usage metering, quota enforcement, and billing integration with Stripe. Built with correctness guarantees for financial operations.

## Features

- **Idempotent Usage Metering**: Exactly-once semantics prevent double-charging from network retries
- **Quota Enforcement**: Honest API boundaries with proper status codes (429/402)
- **AI Token Pricing**: Handles complex pricing rules (cached tokens, reasoning tokens, etc.)
- **Stripe Integration**: Test-mode subscription management with verified webhooks
- **Cost Calculation**: Accurate money math using integer arithmetic
- **Multi-tenant Architecture**: Data isolation per tenant

## Tech Stack

- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Docker
- **Payments**: Stripe (Test Mode)
- **Testing**: Jest with Supertest
- **Money Handling**: Integer arithmetic (cents/micro-units)

## Architecture

```
Client ─► Billable API request
└─► MeterService.record(tenant, type, qty, idempotencyKey)
├─ duplicate key? → return original result (no new event)
├─ store usage_event
└─► Quota Check ─► allowed
└─► limit exceeded → 402 / 429 + clear message

GET /usage ◄── rollup(usage_events) → { used, limit, cost }

Stripe Checkout (test mode) ─► subscription created
Stripe ─signed webhook─► /webhooks/stripe
├─► verify signature (forged → 400)
├─► deduplicate event (replay → ignored)
└─► update tenant plan / status
```

## Setup

### Prerequisites

- Node.js (v14+)
- Docker and Docker Compose
- Stripe CLI (for local webhook testing)

### Installation

1. Clone the repository
2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start PostgreSQL:
```bash
docker-compose up -d
```

4. Initialize database schema:
```bash
psql -h localhost -U postgres -d usage_metering -f schema.sql
```

5. Install dependencies:
```bash
npm install
```

6. Configure Stripe test keys in `.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Running the Application

```bash
npm start
```

The server will start on port 3000 by default.

## API Endpoints

### Usage Metering

#### Record Usage
```http
POST /api/usage
Content-Type: application/json

{
  "tenant_id": "uuid",
  "usage_type": "api_call",
  "quantity": 10,
  "idempotency_key": "unique-key",
  "metadata": {}
}
```

#### Get Usage Summary
```http
GET /api/usage/:tenant_id
```

### Stripe Integration

#### Create Checkout Session
```http
POST /api/stripe/checkout
Content-Type: application/json

{
  "tenant_id": "uuid",
  "plan_name": "Pro"
}
```

#### Webhook Handler
```http
POST /api/stripe/webhooks
Stripe-Signature: [signature]
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Test Coverage

- Idempotency guarantees (no double-counting)
- Quota boundary cases (at/under/over limits)
- AI token pricing calculations
- Webhook signature verification
- Duplicate webhook prevention

## Pricing Configuration

The system uses integer arithmetic for all monetary calculations to avoid floating-point errors:

### API Calls
- Cost: 1 cent per API call

### AI Tokens (per 1M tokens)
- Input tokens: $0.30 (30 cents)
- Cached input tokens: $0.10 (10 cents)
- Output tokens: $0.60 (60 cents)
- Reasoning tokens: $0.60 (60 cents, counted as output)

## Stripe Webhook Testing

Use the Stripe CLI to test webhooks locally:

```bash
# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## Database Schema

### Tables
- `plans`: Subscription plans with limits
- `tenants`: Customer/tenant information
- `subscriptions`: Stripe subscription records
- `usage_events`: Usage records with idempotency keys

### Key Constraints
- Unique constraint on `(tenant_id, idempotency_key)` prevents duplicate usage events
- Foreign key constraints ensure data integrity
- Indexes on frequently queried columns

## Correctness Guarantees

### Idempotency
- Every usage event is uniquely identified by `tenant_id + idempotency_key`
- Duplicate requests return the original result without creating new charges
- Tested with automated test suite

### Quota Enforcement
- Usage checked against plan limits before recording
- Honest status codes: 429 (Too Many Requests) when at limit, 402 (Payment Required) when would exceed
- Boundary conditions tested (at limit, just under, just over)

### Money Math
- All monetary values stored as integers (cents)
- AI token pricing uses per-million rate calculations
- Pricing constants pinned and covered by tests

### Webhook Security
- Stripe signature verification prevents forged events
- Event deduplication prevents double-processing
- Database transactions ensure atomic updates

## Development

### Project Structure
```
src/
├── config/          # Database and pricing configuration
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── services/        # Business logic
├── app.js           # Express app setup
└── server.js        # Server entry point

tests/               # Test files
schema.sql           # Database schema
docker-compose.yml   # PostgreSQL setup
```

## License

MIT

## Built for FlyRank Backend Internship - Capstone Project
