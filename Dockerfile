# Travel Planner Docker Image
# Multi-stage build for optimized production image

# Stage 1: Build
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Force fresh build by invalidating cache (update this to force rebuild)
ARG CACHE_BUST=1

# Build the client using Vite with verbose output
RUN echo "=== Starting Vite build ===" && \
    bunx vite build --debug 2>&1 || { echo "=== Vite build failed ==="; exit 1; }

# Debug: List what was built
RUN echo "=== BUILD OUTPUT ===" && ls -la client/dist/ && echo "=== End BUILD OUTPUT ==="

# Stage 2: Production
FROM oven/bun:1.3-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built client from builder stage (Vite outputs to client/dist)
# This includes index.html and assets/ folder with hashed JS/CSS files
COPY --from=builder /app/client/dist ./dist

# Debug: Verify files were copied (including assets folder)
RUN echo "=== DIST FOLDER CONTENTS ===" && ls -la dist/ && \
    echo "=== ASSETS FOLDER ===" && ls -la dist/assets/ 2>/dev/null || echo "No assets folder"

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
