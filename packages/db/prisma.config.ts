import { defineConfig, env } from 'prisma/config'

// Prisma 7 no longer auto-loads .env. The workspace keeps a single .env
// at the repo root, so load it explicitly before reading DATABASE_URL.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url).pathname)
} catch {
  // Fine in CI / production where the environment is already populated.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun run --env-file=../../.env prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
