# Usage Metering & Billing Engine

A production-grade backend service for SaaS usage metering, quota enforcement, and billing integration with Stripe. Built with correctness guarantees for financial operations.

## Features

- **Authentication & Authorization**: Protected administrative operations and tenant-scoped access
- **API Key Lifecycle**: Secure API key creation, listing, rotation, and immediate revocation
- **Tenant Scoping**: Strict isolation preventing tenants from viewing or altering other tenants' usage or invoices
- **Idempotent Usage Metering**: Exactly-once semantics prevent double-charging from network retries
- **Quota Enforcement**: Honest API boundaries with proper status codes (429/402)
- **AI Token Pricing**: Handles complex pricing rules (cached tokens, reasoning tokens, etc.)
- **Stripe Integration & Optional Mode**: Raw-body HMAC verification, configurable Price IDs, and seamless startup without Stripe configured
- **Cost Calculation**: Accurate money math using integer arithmetic

## Tech Stack

- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Docker
- **Payments**: Stripe (Test Mode, optional)
- **Testing**: Jest with Supertest 
- **Money Handling**: Integer arithmetic (cents/micro-units)

## Setup & Quickstart

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```
Default values in `.env.example` are pre-configured to work immediately.

### Step 3: Start & Initialize PostgreSQL
```bash
# Start PostgreSQL container
npm run db:start

# Initialize database schema and verify migrations
npm run db:init
```

### Step 4: Seed Demo Data (Optional)
```bash
npm run seed
```
This prints a demo `Tenant ID`, an active `API Key`, and the `Admin Key`.

### Step 5: Start the Server
```bash
npm start
```
Starts backend on `http://localhost:3000` (or configured `PORT`).

> **Note on Stripe**: Stripe is completely optional. The platform starts and runs cleanly from a fresh clone without any Stripe credentials. When Stripe keys are omitted, Stripe endpoints gracefully respond with `503 Service Unavailable`.

---

## Authentication & Scoping

### 1. Administrative Operations
All admin endpoints (`/api/admin/*`, tenant CRUD `/api/tenants`) require administrative authentication via:
- `Authorization: Bearer <ADMIN_API_KEY>` or
- `x-admin-key: <ADMIN_API_KEY>`

```bash
# Example: List all tenants
curl -H "Authorization: Bearer admin-secret-key" http://localhost:3000/api/admin/tenants
```

### 2. Tenant API Requests & Secure Scoping
Billable and metering endpoints (`/api/usage`, `/api/generate`, `/api/invoices`) require a valid Tenant API key:
- `Authorization: Bearer <API_KEY>` or
- `x-api-key: <API_KEY>`

**Tenant Scoping Guarantees**:
- Unauthenticated requests receive `401 Unauthorized`.
- Tenants can only view their own usage summaries and invoices. Attempts to view another tenant's data receive `403 Forbidden`.
- Usage recorded via `/api/usage` is always tied strictly to the authenticated tenant.
- A revoked API key immediately fails with `401 Unauthorized`.

---

## API-Key Lifecycle

### Create API Key
```http
POST /api/tenants/:tenant_id/api-keys
Authorization: Bearer <ADMIN_API_KEY>
Content-Type: application/json

{
  "name": "Production Key"
}
```
*Returns the plaintext key once (`sk_live_...`).*

### List API Keys
```http
GET /api/tenants/:tenant_id/api-keys
Authorization: Bearer <API_KEY or ADMIN_API_KEY>
```
*Lists key metadata (prefix, name, status, last_used_at, created_at, revoked_at) without leaking secret hashes.*

### Rotate API Key
```http
POST /api/tenants/:tenant_id/api-keys/:key_id/rotate
Authorization: Bearer <API_KEY or ADMIN_API_KEY>
```
*Atomically revokes the old key and generates a new active key.*

### Revoke API Key
```http
DELETE /api/tenants/:tenant_id/api-keys/:key_id
Authorization: Bearer <API_KEY or ADMIN_API_KEY>
```
*Immediately revokes the key. Subsequent requests using it will fail with `401 Unauthorized`.*

---

## API Endpoints Summary

### Core Metering
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/usage` | Tenant API Key | Record usage event (idempotent) |
| POST | `/api/generate` | Tenant API Key | Simulated billable AI generate endpoint |
| GET | `/api/usage` | Tenant API Key | Get current tenant's usage summary |
| GET | `/api/usage/:tenant_id` | Tenant (scoped) or Admin | Get usage summary |
| GET | `/api/invoices` | Tenant API Key | Get current tenant's invoices |
| GET | `/api/invoices/:tenant_id` | Tenant (scoped) or Admin | Get tenant invoices |

### Administration
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/tenants` | Admin Key | List tenants with usage & cost |
| POST | `/api/admin/tenants` | Admin Key | Create tenant |
| PUT | `/api/admin/tenants/:id` | Admin Key | Update tenant |
| DELETE | `/api/admin/tenants/:id` | Admin Key | Delete tenant |
| GET | `/api/admin/metrics` | Admin Key | Global metrics |

### Stripe Integration
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/stripe/checkout` | Create checkout session |
| POST | `/api/stripe/upgrade` | Upgrade subscription |
| POST | `/api/stripe/webhooks` | Verified webhook handler (raw body HMAC) |

---

## Testing

Run the full automated test suite:
```bash
npm test
```

### Test Coverage
- Administrative authentication and authorization (401 on unauthorized access)
- Strict tenant data isolation and cross-tenant access rejection (403 on tenant mismatch)
- API key creation, listing, rotation, and revocation guarantees
- Exactly-once usage idempotency
- Quota enforcement boundaries (402 on limit exceeded, 429 when at limit)
- AI token pricing calculations
- Stripe raw-body webhook signature verification
- Optional Stripe initialization and configurable Price IDs
