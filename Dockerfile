# Stage 1: Install dependencies
FROM node:18-alpine as deps
WORKDIR /app
COPY package.json ./
RUN yarn install --frozen-lockfile

# Stage 2: Build the application
FROM node:18-alpine as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Stage 3: Prepare the runtime environment
FROM node:18-alpine as runner
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
CMD [ "node", "dist/main" ]
