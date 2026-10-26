# Quick Start Guide

This guide will help you get the Usage Metering & Billing Engine running locally in minutes from a clean clone.

## Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- Git

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```
Default values in `.env` are ready for local development:
- `ADMIN_API_KEY=admin-secret-key`
- PostgreSQL mapped to port `5434` (Docker default)
- Stripe is optional and test-ready

## Step 3: Start and Initialize Database

```bash
# Start PostgreSQL container
npm run db:start

# Initialize database schema & verify migrations
npm run db:init
```

## Step 4: Seed Demo Tenant & API Key

```bash
node scripts/seed-db.js
```
Output:
```
Successfully seeded database for Demo Prep.
Tenant ID:  <TENANT_UUID>
API Key:    sk_live_<SECRET>
Admin Key:  admin-secret-key
```

## Step 5: Start the Server

```bash
npm start
```
Server runs on `http://localhost:3000` (or configured `PORT`).

## Step 6: Test Authenticated Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Admin Endpoint (Requires Admin Key)
```bash
curl -H "Authorization: Bearer admin-secret-key" http://localhost:3000/api/admin/tenants
```

### 3. Record Billable Usage (Requires Tenant API Key)
```bash
curl -X POST http://localhost:3000/api/usage \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "usage_type": "api_call",
    "quantity": 1,
    "idempotency_key": "unique-request-123"
  }'
```

### 4. Get Tenant Usage Summary (Scoped)
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3000/api/usage
```

### 5. API Key Rotation
```bash
curl -X POST http://localhost:3000/api/tenants/YOUR_TENANT_ID/api-keys/YOUR_KEY_ID/rotate \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Step 7: Run Automated Tests

```bash
npm test
```
All tests including security, scoping, idempotency, and Stripe verification run against the test suite.

## Stopping the Application

```bash
npm run db:stop
```
