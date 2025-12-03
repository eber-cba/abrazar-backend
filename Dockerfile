# ============================================
# Multi-stage Dockerfile for Abrazar Backend
# ============================================

# Stage 1: Base - Common foundation
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl curl dumb-init
COPY package*.json ./
COPY prisma ./prisma/

# Stage 2: Dependencies (All) - For development/testing
FROM base AS deps
RUN npm install --legacy-peer-deps
RUN npx prisma generate

# Stage 3: Development - Full featured with hot reload
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage 4: Test - Runs test suite
FROM deps AS test
# Copy all source files including tests
COPY . .
# Explicitly ensure tests are present (in case .dockerignore excludes them)
COPY tests ./tests
# Run migrations and then tests
CMD ["sh", "-c", "npx prisma migrate deploy && npm test"]

# Stage 5: Production - Minimal runtime image
FROM node:18-alpine AS production
WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache openssl curl dumb-init

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install production dependencies only
RUN npm install --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy generated Prisma Client from deps stage
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy application source (excluding tests, docs per .dockerignore)
COPY src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment
ENV NODE_ENV=production
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
