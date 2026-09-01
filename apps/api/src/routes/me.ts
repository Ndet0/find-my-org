import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { getCurrentUser } from '../services/user.service.js'

export const meRoutes = new Hono<AppEnv>()

// Authenticated but not permission-gated: every active user may read their
// own profile, whatever their role.
meRoutes.use('*', requireAuth)

/**
 * The signed-in user's profile, joined with the role and department names
 * that clients need for navigation and permission-aware UI. The session
 * carries only ids.
 */
meRoutes.get('/', async (c) => {
  return ok(c, await getCurrentUser(c.get('user').id))
})
