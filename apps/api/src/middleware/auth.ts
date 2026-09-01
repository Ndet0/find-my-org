import { auth } from '@opsflow/auth'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../lib/context.js'
import { forbidden, unauthorized } from '../lib/errors.js'
import { roleNameById } from '../lib/roles.js'

/**
 * Resolves the caller's session and rejects anyone who is not a signed-in,
 * active user with a role the permission matrix recognises.
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

  // `users.role_id` is NOT NULL, but Better Auth is told the field is
  // optional so its payload validation runs before the create hook that
  // supplies it. The column is the real guarantee; this narrows the type.
  const { roleId } = result.user

  if (!roleId) {
    console.error(`[auth] user ${result.user.id} has no role_id`)
    throw forbidden('This account has no role assigned')
  }

  const role = await roleNameById(roleId)

  // Fail closed. An unrecognised role is a data problem, not a reason to
  // fall back to a default set of permissions.
  if (!role) {
    console.error(`[auth] user ${result.user.id} has unknown role_id ${roleId}`)
    throw forbidden('This account has no role assigned')
  }

  c.set('user', result.user)
  c.set('session', result.session)
  c.set('role', role)

  await next()
})
