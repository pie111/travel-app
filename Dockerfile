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

# Build the client using Vite
RUN bunx vite build

# Debug: List what was built
RUN echo "=== BUILD OUTPUT ===" && ls -la client/dist/

# Stage 2: Production
FROM oven/bun:1.3-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built client from builder stage (Vite outputs to client/dist)
# This includes main.js and main.css (no index.html from Vite)
COPY --from=builder /app/client/dist ./dist

# Debug: Verify files were copied
RUN echo "=== DIST FOLDER CONTENTS ===" && ls -la dist/

# Create production index.html that references the built assets
# Vite outputs main.js and main.css without hashes in this config
RUN echo '<!DOCTYPE html>\
<html lang="en">\
<head>\
<meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<meta name="description" content="Find your perfect travel destination with AI-powered recommendations">\
<title>Travel Planner - AI-Powered Travel</title>\
<link rel="stylesheet" href="/main.css">\
</head>\
<body>\
<div id="root"></div>\
<script type="module" src="/main.js"></script>\
</body>\
</html>' > ./dist/index.html

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
