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

# Prune the monorepo to only include blog-service and its dependencies
RUN turbo prune package-service --docker

# -------------------- Installer Stage --------------------
FROM base AS installer

WORKDIR /app

# Copy pruned JSON files (package.json, lockfile, etc.)
COPY --from=builder /app/out/json/ ./

# Install dependencies
RUN npm install

# Copy full source files from pruned output
COPY --from=builder /app/out/full/ ./

# Navigate to database directory to run Prisma commands with .env properly loaded
WORKDIR /app/packages/database

ARG DATABASE_URL

# 👇 Create .env file for Prisma (required for schema to read env var)
RUN echo "DATABASE_URL=$DATABASE_URL" > .env

# ✅ Generate Prisma client
RUN echo "Generating Prisma Client..." && \
    cat .env && \
    npx prisma generate

# 🔐 Delete .env after generation for safety
RUN rm .env  

# Back to root dir and build blog-service
WORKDIR /app
RUN npm run build

# -------------------- Runner Stage --------------------
FROM base AS runner

WORKDIR /app

# Security: use a non-root user
RUN addgroup --system --gid 1001 nodegroup \
 && adduser --system --uid 1001 nodeuser

RUN mkdir -p /app/apps/package-service/uploads/package-thumbnails \
   && chown -R nodeuser:nodegroup /app/apps/package-service/uploads  

# Copy built application
COPY --from=installer /app .

# Change ownership recursively after copy just in case
RUN chown -R nodeuser:nodegroup /app
   
USER nodeuser

# Expose package-service port
EXPOSE 5004

# Start the package-service
CMD sh -c "cd packages/database && npx prisma migrate deploy && cd ../../ && npm run dev"

