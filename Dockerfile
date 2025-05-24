# Stage 1: Install dependencies using npm
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Run tests
FROM node:18-alpine AS tester
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# COPY ./.env.test.build ./.env.test
RUN npm run test:unit
# RUN npm run test:e2e

# Stage 3: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY certs ./certs
RUN npm run build

# Stage 4: Prepare the runtime environment
FROM node:18-alpine AS runner
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/certs ./certs
# COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD [ "node", "dist/main" ]