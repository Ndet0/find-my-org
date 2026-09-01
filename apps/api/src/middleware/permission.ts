import { can, type Permission } from '@opsflow/types/permissions'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../lib/context.js'
import { forbidden } from '../lib/errors.js'

/**
 * Gates a route on a role-level permission. Compose it after `requireAuth`,
 * which resolves the role this reads.
 *
 * This answers "may this role attempt the operation", which is all a
 * middleware can know before the handler has loaded anything. Deciding
 * *which rows* the caller may see is the service layer's job, because it
 * needs the query.
 */
export function requirePermission(permission: Permission) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!can(c.get('role'), permission)) {
      throw forbidden()
    }

    await next()
  })
}
