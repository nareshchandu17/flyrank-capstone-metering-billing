# End-to-End Demonstration & Quickstart Guide

This guide enables any developer to start from a clean clone, boot the application, seed reproducible demo data, run billable workflows, and inspect live results in the UI without manually altering the database.

---

## ⚡ 1. Prerequisites & Clean Clone Setup

- **Node.js**: v18+
- **Docker & Docker Compose**: Installed and running
- **Git**: Installed

### Step 1: Install Dependencies
```bash
# Root backend dependencies
npm install

# Frontend dependencies
npm run install:frontend
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```
Default configuration values in `.env` are ready for instant execution:
- `PORT=3001` (Backend API)
- `ADMIN_API_KEY=admin-secret-key`
- `DB_PORT=5434` (Matches Docker PostgreSQL port mapping)
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` (Preconfigured for test mode; platform also runs cleanly without Stripe configured)

---

## 🚀 2. Start PostgreSQL & Initialize Schema

```bash
# Start PostgreSQL container
npm run db:start

# Initialize database schema, constraints, and plans
npm run db:init
```

---

## 🧪 3. Run Automated Release Gate Tests

```bash
# Execute all 7 test suites (82 comprehensive tests)
npm test
```
**Test Coverage Includes:**
- Security & authorization boundaries (401/403 isolation)
- API key lifecycle: generation, one-time reveal, rotation, and revocation
- Strict positive integer input validation
- Atomic idempotency keys and conflicting payload detection (409 Conflict)
- Concurrency-safe quota limits (402/429)
- Exact AI token money math (input, cached, output, reasoning) without rounding down to zero
- Deduplicated quota warning alerts (80%, 100%)
- Replay-safe Stripe webhook signature verification (valid, invalid, replayed events)
- Idempotent invoice creation with database uniqueness constraints `(tenant_id, billing_period)`
- Stripe subscription drift reconciliation

---

## 📦 4. Seed Reproducible Demo Environment

```bash
npm run seed
```
This command seeds realistic, reproducible demo data:
- **Tenant 1: Acme AI Technologies** (Pro Plan - Active)
  - Pre-seeded API key: `sk_live_demo_acme_tech_key_001`
  - 8 real usage events across past 24 hours
  - 2 invoices: 1 Paid previous invoice, 1 Open/Pending current invoice
- **Tenant 2: Startup Studio** (Free Plan - Quota Alert Demo)
  - Pre-seeded API key: `sk_live_demo_startup_studio_002`
  - 85,000 / 100,000 tokens used (85% of Free quota)
  - Active 80% quota warning alert in database

---

## 🖥️ 5. Run the Application

```bash
# Option A: Start both backend and frontend concurrently
npm run dev:all

# Option B: Run separately
npm run dev           # Backend on http://localhost:3001
npm run dev:frontend  # Frontend UI on http://localhost:5173
```

---

## 🔍 6. End-to-End Demonstration Walkthrough

Follow these steps to prove the entire workflow from start to finish:

### Step A: Verify Dashboard Numbers Match Database
1. Open the UI at `http://localhost:5173`.
2. Inspect the **Overview** page:
   - Total Tenants, Active Tenants, Total Revenue, and Real-Time 24h Usage chart load directly from PostgreSQL.
   - Billing status bar displays real paid vs. pending invoice counts.

### Step B: Provision a New Tenant & Generate API Key
1. Navigate to **Tenants** (`http://localhost:5173/tenants`).
2. Click **+ New Tenant** and create "Beta Labs" (`beta@example.com`).
3. Click on the tenant card to open the **Tenant Inspection Drawer**.
4. In the **API Keys Manager** section:
   - Click **+ Generate Key**, provide a label ("Beta Dev Key"), and submit.
   - **One-Time Secret Reveal**: The raw API key (`sk_live_...`) is presented in a modal with a **Copy Key** button.
   - Click **Done**. Subsequent views only display key prefix and masked hashes.

### Step C: Ingest Billable Usage via Authorized API
Record a real AI token usage event with prompt, cached input, output, and reasoning tokens:
```bash
curl -X POST http://localhost:3001/api/usage \
  -H "Authorization: Bearer <COPIED_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "usage_type": "ai_tokens",
    "quantity": 50000,
    "idempotency_key": "beta-test-run-001",
    "metadata": {
      "input_tokens": 30000,
      "cached_input_tokens": 10000,
      "output_tokens": 7000,
      "reasoning_tokens": 3000
    }
  }'
```
*Expected Response (`201 Created`)*: Event is atomically stored.

### Step D: Verify Idempotency & Conflict Handling
1. **Replay identical request**:
   Resend the exact same cURL request.
   *Expected Response (`200 OK`)*: Returns existing event record without incrementing database usage counters.
2. **Conflicting request**:
   Change `"quantity": 99999` while keeping `"idempotency_key": "beta-test-run-001"`.
   *Expected Response (`409 Conflict`)*: Rejects conflicting payload with idempotency conflict error.

### Step E: Inspect Real-Time Costs in UI
1. Navigate to **Usage** (`http://localhost:5173/usage`).
2. The event feed instantly reflects the ingested event with:
   - Input Tokens: `30,000`
   - Cached Input: `10,000`
   - Output: `7,000`
   - Reasoning: `3,000`
   - Exact Sub-Cent Calculated Cost.
3. Click **Export CSV** to verify that client-side CSV generation downloads real records matching your filters.

### Step F: Run Billing & Generate Invoice in Test Mode
1. Navigate to **Billing & Invoices** (`http://localhost:5173/history`).
2. Click **+ Run Invoice Generation**.
3. Select your tenant and period (e.g., `2026-10`).
4. Click **Generate Invoice**:
   - PostgreSQL creates an invoice with itemized line items (base subscription, API calls, AI tokens breakdown).
   - Database constraint ensures no duplicate invoice can exist for the same tenant and period.
5. Click **View Line Items** to inspect itemized amounts and sub-cent precision totals.
6. Click **Stripe Invoice Link** to view the hosted checkout/invoice link.

### Step G: Run Settings & Stripe Reconciliation
1. Navigate to **Settings** (`http://localhost:5173/settings`).
2. Click **Run Reconciliation** to synchronize subscription and status records between Stripe test mode and PostgreSQL.
3. Notification confirms all subscriptions are in sync without manual database repairs.

---

## 🛠️ Production Build Verification

```bash
# Test production bundle compilation
npm run build:frontend
```
Generates clean minified assets in `frontend/dist/` with 0 errors.
