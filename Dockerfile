# Stage 1: Install all dependencies using npm
FROM node:18-alpine AS all-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Install production dependencies using npm
FROM node:18-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: Run tests
FROM node:18-alpine AS tester
WORKDIR /app
COPY --from=all-deps /app/node_modules ./node_modules
COPY . .
# COPY ./.env.test.build ./.env.test
RUN npm run test:unit
# RUN npm run test:e2e

# Stage 4: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=all-deps /app/node_modules ./node_modules
COPY . .
COPY public ./public
# Set build-time argument for version
ARG VERSION
ENV VERSION=${VERSION}
RUN npm run build

# Stage 5: Prepare the runtime environment
FROM node:18-alpine AS runner
WORKDIR /app
# Set runtime argument for version
ARG VERSION
ENV VERSION=${VERSION}
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD [ "node", "dist/main" ]