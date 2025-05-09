# Base image
FROM node:18-alpine AS base

# Add libc6-compat for potential binary compatibility issues (optional, often needed)
RUN apk add --no-cache libc6-compat

# -------------------- Builder Stage --------------------
FROM base AS builder

# Set working directory
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy the full monorepo (adjust context in docker-compose if needed)
COPY . .

# Prune the monorepo to only include the user-service and its dependencies
RUN turbo prune user-service --docker

# -------------------- Installer Stage --------------------
FROM base AS installer

WORKDIR /app

# Copy pruned package.jsons and lock files
COPY --from=builder /app/out/json/ ./

# Install only the required dependencies
RUN npm install

# Copy full pruned source code
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

# Add a non-root user for better security
RUN addgroup --system --gid 1001 nodegroup \
 && adduser --system --uid 1001 nodeuser

USER nodeuser

# Copy built files from installer
COPY --from=installer /app .

# Expose the port
EXPOSE 5001

# Start the app (assumes correct workspace setup)
CMD sh -c "cd packages/database && npx prisma migrate deploy && cd ../../ && npm run dev"
