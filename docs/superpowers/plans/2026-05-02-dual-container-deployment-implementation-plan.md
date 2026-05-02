# Dual Container Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production Dockerfiles for the Web app and Python sync API without committing real infrastructure URLs, so both services can be built and launched independently with runtime environment variables.

**Architecture:** Build one standalone Next.js production image for `apps/web` and one Python production image for `backend`. Keep both images free of real secrets and `.env` files, document only variable names, and verify the images can build and start with placeholder configuration.

**Tech Stack:** Docker, Next.js standalone output, Python, Uvicorn entrypoint, pnpm

---

## File Structure

- Create: `apps/web/Dockerfile`
  - Multi-stage standalone production image
- Create: `backend/Dockerfile`
  - Production image that runs `byr-sync-api`
- Create: `.dockerignore`
  - Prevent local env files, build caches, and node modules from entering image builds
- Modify: `apps/web/next.config.ts`
  - Ensure standalone output is enabled
- Modify: `apps/web/README.md`
  - Add Docker build/run guidance with placeholder env vars only
- Modify: `backend/README.md`
  - Add backend image build/run guidance with placeholder env vars only

### Task 1: Enable standalone output for the Web app

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Update Next config for standalone builds**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Run a local Web build**

Run: `npx pnpm@10.11.0 --filter @bbs/web build`  
Expected: PASS with `.next/standalone` produced

- [ ] **Step 3: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "build: enable standalone web output"
```

### Task 2: Add a root `.dockerignore`

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create the ignore file**

```gitignore
.git
.worktrees
node_modules
apps/web/node_modules
packages/*/node_modules
backend/.venv
backend/.pytest_cache
apps/web/.next
**/.env
**/.env.*
dist
coverage
```

- [ ] **Step 2: Verify Docker sees the ignore file**

Run: `sed -n '1,200p' .dockerignore`  
Expected: shows node modules, `.env`, and build cache exclusions

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "build: ignore local secrets and caches in docker builds"
```

### Task 3: Add the Web production Dockerfile

**Files:**
- Create: `apps/web/Dockerfile`

- [ ] **Step 1: Create the multi-stage Web Dockerfile**

```dockerfile
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/state/package.json packages/state/package.json
COPY packages/test-utils/package.json packages/test-utils/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @bbs/web build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 2: Build the Web image**

Run: `docker build -f apps/web/Dockerfile -t bbs-web:local .`  
Expected: PASS with image `bbs-web:local`

- [ ] **Step 3: Commit**

```bash
git add apps/web/Dockerfile
git commit -m "build: add web production dockerfile"
```

### Task 4: Add the Python backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create the backend Dockerfile**

```dockerfile
FROM python:3.13-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/pyproject.toml backend/uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev

COPY backend/src ./src
COPY backend/README.md ./README.md

ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["uv", "run", "byr-sync-api"]
```

- [ ] **Step 2: Build the backend image**

Run: `docker build -f backend/Dockerfile -t bbs-sync-api:local .`  
Expected: PASS with image `bbs-sync-api:local`

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "build: add sync api production dockerfile"
```

### Task 5: Document Docker usage without real URLs

**Files:**
- Modify: `apps/web/README.md`
- Modify: `backend/README.md`

- [ ] **Step 1: Add Web Docker guidance with placeholder env names only**

```md
## Docker

Build:

```bash
docker build -f apps/web/Dockerfile -t bbs-web:local .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_API_BASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_API_TOKEN=__ASK_USER_BEFORE_RUNNING__ \
  bbs-web:local
```
```

- [ ] **Step 2: Add backend Docker guidance with placeholder env names only**

```md
## Docker

Build:

```bash
docker build -f backend/Dockerfile -t bbs-sync-api:local .
```

Run:

```bash
docker run --rm -p 8000:8000 \
  -e BBS_USERNAME=__ASK_USER_BEFORE_RUNNING__ \
  -e BBS_PASSWORD=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_API_TOKEN=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_REDIS_URL=__ASK_USER_BEFORE_RUNNING__ \
  bbs-sync-api:local
```
```

- [ ] **Step 3: Verify no real connection strings were introduced**

Run: `rg -n "postgresql://|redis://|__ASK_USER_BEFORE_RUNNING__" apps/web/README.md backend/README.md apps/web/Dockerfile backend/Dockerfile .dockerignore`  
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add apps/web/README.md backend/README.md
git commit -m "docs: add docker run guidance with placeholder env vars"
```
