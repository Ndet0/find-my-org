import { prisma } from '@opsflow/db'
import { Hono } from 'hono'
import { fail, ok } from '../lib/response.js'

export const healthRoutes = new Hono()

/**
 * Liveness + database reachability. Deployment platforms poll this,
 * so it must not require authentication.
 */
healthRoutes.get('/', async (c) => {
  const startedAt = performance.now()

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    console.error('[health] database unreachable', err)
    return fail(c, 'DATABASE_UNAVAILABLE', 'Database is not reachable', 503)
  }

  return ok(c, {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    database: { connected: true, latencyMs: Math.round(performance.now() - startedAt) },
    timestamp: new Date().toISOString(),
  })
})
