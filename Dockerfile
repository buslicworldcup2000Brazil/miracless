# Multi-stage build for Miracless Lottery Bot

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies
RUN npm run install:all

# Copy source code
COPY . .

# Generate Prisma client (only if not already generated)
RUN cd backend && (test -d node_modules/.prisma || npx prisma generate)

# Build frontend
RUN npm run build:frontend

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/package*.json ./

# Copy Prisma schema and generated client
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma

# Install production dependencies only (force npm install instead of npm ci)
RUN cd backend && rm -f package-lock.json && npm install --production --no-optional --ignore-scripts

# Install dev dependencies temporarily for Prisma generation
RUN cd backend && npm install --save-dev prisma @prisma/client

# Generate Prisma client for production
RUN cd backend && npx prisma generate

# Run database migrations
RUN cd backend && npx prisma db push --accept-data-loss

# Remove dev dependencies after generation
RUN cd backend && npm uninstall prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]