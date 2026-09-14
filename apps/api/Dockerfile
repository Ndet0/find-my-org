# The OPSflow API: Hono on Bun, talking to PostgreSQL through Prisma.
#
# Build from the repository root, not from this directory — the install needs
# the lockfile and every workspace manifest:
#
#   docker build -f apps/api/Dockerfile -t opsflow-api .
#
# The image carries both runtimes on purpose. Bun runs the server; Node runs
# the Prisma CLI, because `prisma migrate deploy` still shells out to the
# schema-engine binary, which needs glibc and OpenSSL (so Debian, not Alpine).
# Render's pre-deploy command and its start command run in this same image, so
# the migration tooling has to be here and not only in a build stage.
FROM node:24-bookworm-slim

# Pinned rather than read from `packageManager` and `.github/workflows/ci.yml`,
# which is where these two versions also live. Keep the three in step.
RUN npm install --global bun@1.3.11 pnpm@11.1.3

WORKDIR /app

# Manifests before source, so editing a route does not re-run the install.
# pnpm resolves `--frozen-lockfile` against every importer in the lockfile, so
# all eight manifests have to be here even though most are not installed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/

# The API's dependency closure: no Vite and no Expo application code, but
# roughly 730 packages all the same. `packages/auth` depends on
# @better-auth/expo for the mobile session plugin, and pnpm installs that
# plugin's peers, so react-native and Hermes arrive in an API image. Worth
# knowing when this layer looks slow; see docs/technical_architecture.md §36.
#
# Development dependencies stay, because the Prisma CLI is one of them.
#
# The cache mount keeps the store out of the image and off the network on a
# rebuild. The retry settings are not superstition: a cold install of this size
# reliably times out against a slow registry, and the default of two retries
# fails the whole build when one tarball stalls.
ENV PNPM_HOME=/pnpm
RUN --mount=type=cache,target=/pnpm/store \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_maxtimeout=180000 \
    npm_config_fetch_timeout=600000 \
    pnpm install --frozen-lockfile --filter @opsflow/api... \
      --store-dir /pnpm/store --network-concurrency 8

COPY . .

# `prisma generate` reads the schema and writes TypeScript; it never connects.
# The URL is supplied anyway because prisma.config.ts declares the datasource
# from the environment, and the .env it would otherwise read is not in the image.
RUN DATABASE_URL="postgresql://unused:unused@127.0.0.1:5432/unused" pnpm db:generate

# Not a default: `apps/api/src/lib/env.ts` falls back to `development`, and
# that fallback turns off Secure cookies, the rate limiter and the production
# CORS allow-list.
ENV NODE_ENV=production

# Serving needs nothing but read access to the tree installed above.
USER node

# Straight to Bun rather than through `pnpm start`, so the platform's SIGTERM
# reaches the server instead of a package manager wrapping it.
CMD ["bun", "apps/api/src/index.ts"]
