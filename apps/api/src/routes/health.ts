import { prisma } from '@opsflow/db'
import { Hono } from 'hono'
import { fail, ok } from '../lib/response.js'

export const healthRoutes = new Hono()

/**
 * Liveness + database reachability. Deployment platforms poll this,
 * so it must not require authentication.
 */
/**
 * How long the probe waits for the database before answering 503. The pool
 * has no connect timeout of its own, so a database that accepts the TCP
 * connection and then hangs would otherwise hang the probe with it — and a
 * platform reads a hung probe as "still starting", not "down".
 */
const DATABASE_TIMEOUT_MS = 2_000

/**
 * Resolves with `probe` or rejects once `ms` has passed, whichever is first.
 * The timer is unreferenced so a probe that does answer does not keep the
 * process alive for the rest of the budget.
 */
export function withinTimeout<T>(probe: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms} ms`)), ms)
    timer.unref?.()
  })

  return Promise.race([probe, deadline]).finally(() => clearTimeout(timer))
}

healthRoutes.get('/', async (c) => {
  const startedAt = performance.now()

  try {
    await withinTimeout(prisma.$queryRaw`SELECT 1`, DATABASE_TIMEOUT_MS)
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
