# FinanceHub Docker Image
# Multi-stage build for optimized production image

# Stage 1: Build
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the client
RUN bun build client/src/main.tsx --outdir=client/dist --minify

# Stage 2: Production
FROM oven/bun:1.3-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built client from builder stage
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/index.html ./client/index.html

# Copy server source files
COPY --from=builder /app/index.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run the server
CMD ["bun", "run", "index.ts"]
