# Stage 1: Build
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy lockfile and package.json
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Stage 2: Production
FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy production files from builder
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=builder /usr/src/app/tsconfig.json ./
# Only install production dependencies
RUN pnpm install --prod --frozen-lockfile
# Install tsconfig-paths for runtime path alias resolution
RUN pnpm add tsconfig-paths

# Copy built application
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port
EXPOSE 3000

# Start the application with tsconfig-paths to resolve src/* aliases
CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]