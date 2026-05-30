# =============================================================================
# Crypto Screener FE — Multi-stage Dockerfile
# =============================================================================
# Stage 1 (deps)    — install production + dev dependencies
# Stage 2 (builder) — build the Next.js app (standalone output)
# Stage 3 (runner)  — minimal runtime image (~200 MB vs ~1 GB)
# =============================================================================

# ---- Stage 1: install dependencies ------------------------------------------
FROM node:20-alpine AS deps

# Install libc compatibility shims required by some native modules on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package manifests — lockfile is optional (copied if present)
COPY package.json package-lock.json* ./

# Install ALL deps (including devDeps needed for the build step)
# npm install is used instead of npm ci to handle missing/mismatched lockfile
RUN npm install


# ---- Stage 2: build ---------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# Pass them as build args so CI/CD can override without editing this file.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_KEY=""
ARG NEXT_PUBLIC_USE_MOCK_DATA=false

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_USE_MOCK_DATA=$NEXT_PUBLIC_USE_MOCK_DATA

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ---- Stage 3: runtime -------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what the standalone server needs
COPY --from=builder /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next.config.ts output:"standalone" generates server.js at the root
CMD ["node", "server.js"]
