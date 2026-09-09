import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { getCurrentUser, updateProfile } from '../services/user.service.js'
import { validateUpdateProfile } from '../validators/user.validator.js'

export const meRoutes = new Hono<AppEnv>()

// Authenticated but not permission-gated: every active user may read and
// edit their own profile, whatever their role.
meRoutes.use('*', requireAuth)

/**
 * The signed-in user's profile, joined with the role and department names
 * that clients need for navigation and permission-aware UI. The session
 * carries only ids.
 */
meRoutes.get('/', async (c) => {
  return ok(c, await getCurrentUser(c.get('user').id))
})

/**
 * Name and phone. Everything else belongs to an administrator, and a
 * password change goes to Better Auth's own `/api/auth/change-password`.
 */
meRoutes.patch('/', validateUpdateProfile, async (c) => {
  return ok(c, await updateProfile(c.req.valid('json'), eventActor(c)))
})
