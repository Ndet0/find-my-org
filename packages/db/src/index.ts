import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'

/**
 * Prisma 7 connects through a driver adapter rather than a URL in the
 * schema. `@prisma/adapter-pg` wraps node-postgres, which runs fine
 * under both Bun and Node.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env')
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  })
}

/**
 * A single client instance is reused across hot reloads. Without this,
 * `bun --watch` opens a fresh connection pool on every file save and
 * exhausts Postgres connections within a few minutes.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export * from './generated/client'
