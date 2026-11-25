# Production Dockerfile for Usage Metering & Billing Engine API
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Production image
FROM node:22-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY package*.json ./
COPY schema.sql ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Ensure non-root ownership for security
RUN chown -R node:node /app

# Run as non-privileged user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["node", "src/server.js"]
