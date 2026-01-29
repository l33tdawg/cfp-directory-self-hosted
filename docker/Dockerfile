# =============================================================================
# CFP Directory Self-Hosted - Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# =============================================================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install wget for health checks and tini for proper signal handling
RUN apk add --no-cache wget tini

# Install Prisma CLI and tsx globally for database migrations and seeding
# This ensures all dependencies are properly resolved
RUN npm install -g prisma@6.19.2 tsx@4.7.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Set up standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma client (generated during deps stage)
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

# Copy jiti and babel dependencies for runtime TypeScript/JSX plugin loading
COPY --from=deps /app/node_modules/jiti ./node_modules/jiti
COPY --from=deps /app/node_modules/@babel ./node_modules/@babel

# Copy Next.js and common UI libraries for plugin imports
# NOTE: Do NOT copy react/react-dom - use the standalone output's versions to avoid multiple React instances
COPY --from=deps /app/node_modules/next ./node_modules/next
COPY --from=deps /app/node_modules/lucide-react ./node_modules/lucide-react

# Copy entrypoint script and topics seed script
COPY docker/entrypoint.sh /app/entrypoint.sh
COPY prisma/seed-topics-only.js /app/prisma/seed-topics-only.js

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads && \
    chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Run entrypoint script (handles migrations, topic seeding, and server start)
CMD ["/app/entrypoint.sh"]
