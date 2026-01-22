#!/bin/sh
# =============================================================================
# CFP Directory Self-Hosted - Docker Entrypoint
# =============================================================================
# This script runs on container startup to:
# 1. Run database migrations
# 2. Seed essential data (topics, email templates, settings) if database is fresh
# 3. Start the application
# =============================================================================

set -e

echo "🚀 Starting CFP Directory Self-Hosted..."

# Run database migrations
echo "📦 Running database migrations..."
prisma migrate deploy

# Seed essential data (topics, email templates, and settings) if not present
# This script is safe to run multiple times - it skips if data exists
echo "🌱 Checking essential data..."
node /app/prisma/seed-topics-only.js

# Start the application
echo ""
echo "✨ Starting Next.js server..."
exec node server.js
