#!/bin/bash

# Database initialization script
# This script sets up the PostgreSQL database with the schema

set -e

echo "Waiting for PostgreSQL to be ready..."
until docker exec usage_metering_db pg_isready -U postgres > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is ready - initializing database"

# Copy schema into container and execute it
docker cp schema.sql usage_metering_db:/tmp/schema.sql
docker exec usage_metering_db psql -U postgres -d usage_metering -f /tmp/schema.sql

echo "Database initialization completed"
