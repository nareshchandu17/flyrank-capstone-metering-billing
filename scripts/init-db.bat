@echo off
REM Database initialization script for Windows
REM This script sets up the PostgreSQL database with the schema

echo Waiting for PostgreSQL to be ready...
:waitloop
docker exec usage_metering_db pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL is unavailable - waiting
    timeout /t 1 /nobreak >nul
    goto waitloop
)

echo PostgreSQL is ready - initializing database

REM Copy schema into container and execute it
docker cp schema.sql usage_metering_db:/tmp/schema.sql
docker exec usage_metering_db psql -U postgres -d usage_metering -f /tmp/schema.sql

echo Database initialization completed
