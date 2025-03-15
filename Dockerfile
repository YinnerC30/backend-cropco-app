# Stage 1: Install dependencies using npm
FROM node:18-alpine as deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Run tests
FROM node:18-alpine as tester
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run test

# Stage 3: Build the application
FROM node:18-alpine as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 4: Prepare the runtime environment
FROM node:18-alpine as runner
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD [ "node", "dist/main" ]