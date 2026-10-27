# Usage Metering & Billing Engine

A production-grade platform for SaaS usage metering, quota enforcement, and automated billing with Stripe test mode. Built with correctness guarantees for financial operations, integer money math, sub-cent token precision, atomic idempotency, and interactive user interfaces.

---

## 🚀 Key Features

### 1. Security & Administrative Authorization
- **Strict Role Separation**: Administrative operations (`/api/admin/*`, `/api/tenants/*`) require administrative bearer authentication.
- **Tenant Isolation**: Non-admin tenants can only view their own usage summaries and invoices. Any cross-tenant data access attempts are rejected with `403 Forbidden`.
- **Clean Runnability**: The engine starts and operates smoothly from a clean clone without Stripe configured (`503 Service Unavailable` returned gracefully for payment operations).

### 2. API Key Management Lifecycle
- **One-Time Secret Reveal**: Plaintext secrets (`sk_live_...`) are returned strictly once upon creation or rotation.
- **Secure Hash Storage**: PostgreSQL stores only cryptographic SHA-256 hashes and visible 12-character prefixes.
- **Rotation & Immediate Revocation**: Rotating a key atomically revokes the previous key and issues a new secret. Revoked keys immediately fail with `401 Unauthorized`.

### 3. Trustworthy Metering Engine
- **Strict Input Validation**: Rejects non-integer, negative, zero, and unsupported metric quantities with `400 Bad Request`.
- **Atomic Idempotency**: Exactly-once semantics per tenant and idempotency key prevent double-charging on network retries.
- **Conflicting Retry Protection**: Replays with the same idempotency key but different quantity or metric type are rejected with `409 Conflict`.
- **Concurrency-Safe Quotas**: Race-condition-safe quota checks prevent parallel requests from exceeding plan limits (returning `402 Payment Required` or `429 Too Many Requests`).
- **Deduplicated Usage Alerts**: Threshold warnings (80%, 100%) are deduplicated per tenant, metric type, and billing period in `usage_alerts`.

### 4. Accurate AI Token & API Pricing
- **Category Token Breakdown**: Full support for input, cached input, output, and reasoning tokens.
- **Sub-Cent Micro-Units**: Costs are tracked in micro-cents ($0.000001) and accumulated over the billing cycle, preventing small requests from rounding down to zero.
- **Transparent Formula**:
  - API Calls: $0.01 per call (1 cent)
  - Input Tokens: $0.30 per 1M tokens
  - Cached Input Tokens: $0.10 per 1M tokens
  - Output Tokens: $0.60 per 1M tokens
  - Reasoning Tokens: $0.60 per 1M tokens

### 5. Billing & Stripe Lifecycle in Test Mode
- **Defined Pricing Model**: Defined billing periods (`YYYY-MM`) with calendar month boundaries.
- **Idempotent Invoicing**: Invoices derive accurate itemized line items from usage records, protected by a unique database constraint `(tenant_id, billing_period)`. Replays return the existing invoice.
- **Stripe Integration**:
  - Test-mode Stripe Checkout session creation.
  - Raw-body HMAC webhook signature verification.
  - Replay safety via database-backed `webhook_events` tracking.
  - Automatic plan upgrades on `checkout.session.completed` and downgrades on `customer.subscription.deleted`.
  - Payment synchronization on `invoice.paid` and `invoice.payment_failed`.
- **Subscription Drift Reconciliation**: Automated endpoint and job to reconcile state between Stripe subscriptions and local PostgreSQL records.

### 6. Interactive Modern Web UI
- **Dashboard Overview**: Live tenant counts, revenue, calculated monthly growth, billing status bar (paid/pending/failed), and 24-hour real-time usage chart.
- **Tenants & API Keys Manager**: Complete tenant creation, search, inspection drawer with quota gauges, and API key management modal with clipboard copy.
- **Usage & Event Simulator**: Live event stream with token categorization, client-side RFC-4180 CSV export, and an interactive test event simulator.
- **Billing & Invoices**: Itemized line items inspection, Stripe hosted invoice links, and on-demand invoice generation.
- **Settings**: Administrative API key configuration, live Stripe connection testing, reconciliation runner, and configurable quota alert sliders.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express 5
- **Database**: PostgreSQL with connection pooling (`pg`)
- **Payments**: Stripe Node SDK (Test Mode)
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **Testing**: Jest, Supertest (82 automated tests)
- **Money Handling**: Micro-cent integer arithmetic

---

## ⚡ Quickstart

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### 2. Setup & Database Initialization
```bash
# Install root dependencies
npm install

# Install frontend dependencies
npm run install:frontend

# Copy environment configuration
cp .env.example .env

# Start PostgreSQL container
npm run db:start

# Run schema migrations and setup constraints
npm run db:init
```

### 3. Seed Reproducible Demo Environment
```bash
npm run seed
```
Creates:
- **Acme AI Technologies** (Pro Plan - Active, Stripe customer, 8 usage events, 2 invoices). API Key: `sk_live_demo_acme_tech_key_001`
- **Startup Studio** (Free Plan - Quota alert test, 85,000 / 100,000 tokens used, 80% warning alert). API Key: `sk_live_demo_startup_studio_002`

### 4. Run Locally
```bash
# Run both backend and frontend concurrently
npm run dev:all
```
- **Backend API**: `http://localhost:3001`
- **Frontend UI**: `http://localhost:5173`

---

## 🧪 Automated Test Suite

Run the full automated test suite covering all 7 modules:
```bash
npm test
```

### Test Suites Included:
1. `tests/e2eIntegration.test.js`: Full end-to-end release gate testing tenant provisioning, API key management, usage ingestion, cost accuracy, duplicate retries, and test-mode invoicing.
2. `tests/securityAndRunnability.test.js`: Administrative authentication, tenant scoping, key rotation/revocation, and zero-Stripe startup.
3. `tests/meteringAndPricing.test.js`: Strict validation, atomic idempotency, conflicting retries (409), concurrency-safe quotas, and token breakdown aggregation.
4. `tests/billingWorkflow.test.js`: Idempotent invoice creation, uniqueness constraints, Stripe Checkout, webhook lifecycle, and drift reconciliation.
5. `tests/webhook.test.js`: Stripe webhook tests for valid signatures, invalid signatures, missing headers, and replayed events.
6. `tests/pricing.test.js`: Pricing calculations and sub-cent micro-unit math.
7. `tests/meterService.test.js`: Core metering service unit tests.

---

## 📦 Production Build

```bash
npm run build:frontend
```
Compiles and bundles the production frontend assets in `frontend/dist/` with 0 warnings or errors.

---

## 📖 API Documentation Summary

### Core Metering & Ingestion
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/usage` | Tenant API Key | Record usage event (atomic, idempotent) |
| POST | `/api/generate` | Tenant API Key | Simulated AI generate endpoint with token calculation |
| GET | `/api/usage` | Tenant API Key | Get current tenant usage summary and exact costs |
| GET | `/api/usage/:tenant_id` | Scoped Tenant / Admin | Get tenant usage summary |
| GET | `/api/invoices` | Tenant API Key | List current tenant invoices |
| GET | `/api/invoices/:tenant_id` | Scoped Tenant / Admin | List tenant invoices |

### Administration
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/metrics` | Admin Key | Global metrics and billing status |
| GET | `/api/admin/tenants` | Admin Key | List tenants with real-time usage & revenue |
| POST | `/api/tenants` | Admin Key | Provision new tenant |
| PUT | `/api/admin/tenants/:id` | Admin Key | Update tenant plan or status |
| DELETE | `/api/admin/tenants/:id` | Admin Key | Delete tenant |
| GET | `/api/admin/usage/history` | Admin Key | Global usage feed with exact calculated costs |
| GET | `/api/admin/usage/realtime` | Admin Key | Hourly 24-hour database usage aggregation |

### API Key Lifecycle
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/tenants/:id/api-keys` | Admin Key | Create key (returns raw secret once) |
| GET | `/api/tenants/:id/api-keys` | Admin Key | List tenant keys (prefix and status only) |
| POST | `/api/tenants/:id/api-keys/:keyId/rotate` | Admin Key | Rotate key (revokes old, issues new) |
| DELETE | `/api/tenants/:id/api-keys/:keyId` | Admin Key | Revoke key immediately |

### Stripe & Billing (Test Mode)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/stripe/checkout` | Public / Admin | Create Stripe checkout session |
| POST | `/api/stripe/webhooks` | Stripe Signature | Replay-safe raw-body webhook handler |
| POST | `/api/stripe/reconcile` | Admin Key | Trigger subscription state drift reconciliation |
| POST | `/api/invoices/generate` | Admin Key | Idempotently generate invoice for period |

---

## 📄 License
MIT
