import { auth } from '@opsflow/auth'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../lib/context.js'
import { forbidden, unauthorized } from '../lib/errors.js'

/**
 * Resolves the caller's session and rejects anyone who is not a signed-in,
 * active user.
 *
 * The session is read from the database on every request rather than from
 * Better Auth's cookie cache: suspending a user has to take effect
 * immediately, and a cached session would keep them authenticated until
 * the cache expired.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!result) {
    throw unauthorized()
  }

  if (result.user.status !== 'active') {
    throw forbidden('This account is not active')
  }

  c.set('user', result.user)
  c.set('session', result.session)

  await next()
})
