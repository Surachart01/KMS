# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ── Stage 2: Build Prisma + Production ──
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4556

# Start: migrate DB then run server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
