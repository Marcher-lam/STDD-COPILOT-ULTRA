# STDD Copilot Dockerfile
# Multi-stage build for production deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false && \
    npm cache clean --force

# Copy source code
COPY cli.js ./
COPY src/ ./src/
COPY schemas/ ./schemas/
COPY stdd/ ./stdd/

# Stage 2: Production
FROM node:20-alpine

LABEL org.opencontainers.image.title="STDD Copilot"
LABEL org.opencontainers.image.description="Specification & Test-Driven Development Framework"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /workspace

# Create non-root user
RUN addgroup -g 1000 stdd && \
    adduser -u 1000 -G stdd -s /bin/sh -D stdd

# Copy from builder
COPY --from=builder /app /app

# Create symlink for global usage
RUN ln -s /app/cli.js /usr/local/bin/stdd && \
    chmod +x /usr/local/bin/stdd

# Create workspace directory
RUN mkdir -p /workspace && \
    chown -R stdd:stdd /workspace /app

USER stdd

# Set working directory
WORKDIR /workspace

# Default command
ENTRYPOINT ["stdd"]
CMD ["--help"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD stdd --version || exit 1
