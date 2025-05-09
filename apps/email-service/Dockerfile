# Base image
FROM node:18-alpine AS base

# Add compatibility libraries (required for some native Node modules)
RUN apk add --no-cache libc6-compat

# -------------------- Builder Stage --------------------
FROM base AS builder

WORKDIR /app

# Install Turbo globally
RUN npm install -g turbo

# Copy the full monorepo
COPY . .

# Prune the monorepo to only include email-service and its dependencies
RUN turbo prune email-service --docker

# -------------------- Installer Stage --------------------
FROM base AS installer

WORKDIR /app

# Copy pruned JSON files (package.json, lockfile, etc.)
COPY --from=builder /app/out/json/ ./

# Install dependencies
RUN npm install

# Copy full source files from pruned output
COPY --from=builder /app/out/full/ ./

# Build the email-service
RUN npm run build

# -------------------- Runner Stage --------------------
FROM base AS runner

WORKDIR /app

# Security: use a non-root user
RUN addgroup --system --gid 1001 nodegroup \
 && adduser --system --uid 1001 nodeuser

USER nodeuser

# Copy built application
COPY --from=installer /app .

# Expose email-service port
EXPOSE 5003

# Start the email-service
CMD ["npm","run", "dev"]
