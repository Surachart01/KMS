# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ── Stage 2: Build Next.js ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (overridden at runtime via docker-compose)
ARG NEXT_PUBLIC_API_URL=http://localhost:4556/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN yarn build

# ── Stage 3: Production runner ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed for production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
