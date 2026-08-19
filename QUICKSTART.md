# Quick Start Guide

This guide will help you get the Usage Metering & Billing Engine running locally in minutes.

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- Git

## Step 1: Clone and Setup

```bash
# Navigate to project directory
cd usage-metering-billing-engine

# Install dependencies
npm install
```

## Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# For local development, defaults should work
```

## Step 3: Start Database

```bash
# Start PostgreSQL container
npm run db:start

# Initialize database schema
npm run db:init
```

## Step 4: Start the Server

```bash
# Start the application
npm start
```

The server will start on `http://localhost:3000`

## Step 5: Test the API

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Create a Test Tenant
First, you'll need to create a tenant in the database:

```bash
# Connect to PostgreSQL
docker exec -it usage_metering_db psql -U postgres -d usage_metering

# Create a test tenant
INSERT INTO tenants (name, email, plan_id) 
VALUES ('Test Company', 'test@company.com', (SELECT id FROM plans WHERE name = 'Free'));

# Get the tenant ID
SELECT id FROM tenants WHERE email = 'test@company.com';
```

### Record Usage
```bash
# Replace YOUR_TENANT_ID with the actual UUID from above
curl -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "YOUR_TENANT_ID",
    "usage_type": "api_call",
    "quantity": 10,
    "idempotency_key": "test-unique-key-123"
  }'
```

### Get Usage Summary
```bash
curl http://localhost:3000/api/usage/YOUR_TENANT_ID
```

## Step 6: Run Tests

```bash
# Start test database
npm run test:db:start

# Initialize test database
npm run test:db:init

# Run tests
npm test
```

## Step 7: Stripe Integration (Optional)

For Stripe integration, you'll need:

1. A Stripe account (free)
2. Stripe CLI installed

```bash
# Set your Stripe test keys in .env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger test events
stripe trigger checkout.session.completed
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps

# Check database logs
docker logs usage_metering_db

# Restart database
npm run db:stop
npm run db:start
```

### Port Already in Use
Change the port in `.env`:
```env
PORT=3001
```

### Permission Issues
Make sure Docker has proper permissions:
```bash
# On Linux/Mac
sudo usermod -aG docker $USER

# On Windows, run Docker Desktop as administrator
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Review [EVIDENCE.md](EVIDENCE.md) for implementation proof
- Check [BUILDLOG.md](BUILDLOG.md) for development details
- Explore the API endpoints and integrate with your application

## Stopping the Application

```bash
# Stop the server (Ctrl+C)

# Stop the database
npm run db:stop

# Clean up everything (including volumes)
docker-compose down -v
```
