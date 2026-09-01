import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { getUser, listUsers } from '../services/user.service.js'
import { validateUserIdParam, validateUserListQuery } from '../validators/user.validator.js'

export const userRoutes = new Hono<AppEnv>()

// Reading the people directory is an administrative capability: admins and
// managers have it, employees do not.
userRoutes.use('*', requireAuth, requirePermission('users:read'))

userRoutes.get('/', validateUserListQuery, async (c) => {
  return ok(c, await listUsers(c.req.valid('query')))
})

userRoutes.get('/:id', validateUserIdParam, async (c) => {
  return ok(c, await getUser(c.req.valid('param').id))
})
