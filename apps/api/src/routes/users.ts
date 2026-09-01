import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  createUser,
  getUser,
  listUsers,
  setUserStatus,
  updateUser,
} from '../services/user.service.js'
import {
  validateCreateUser,
  validateUpdateUser,
  validateUpdateUserStatus,
  validateUserIdParam,
  validateUserListQuery,
} from '../validators/user.validator.js'

export const userRoutes = new Hono<AppEnv>()

userRoutes.use('*', requireAuth, requirePermission('users:read'))

userRoutes.get('/', validateUserListQuery, async (c) => {
  return ok(c, await listUsers(c.req.valid('query')))
})

userRoutes.post('/', requirePermission('users:write'), validateCreateUser, async (c) => {
  return ok(c, await createUser(c.req.valid('json')), 201)
})

userRoutes.get('/:id', validateUserIdParam, async (c) => {
  return ok(c, await getUser(c.req.valid('param').id))
})

userRoutes.patch(
  '/:id/status',
  requirePermission('users:write'),
  validateUserIdParam,
  validateUpdateUserStatus,
  async (c) => {
    return ok(
      c,
      await setUserStatus(c.req.valid('param').id, c.req.valid('json').status, c.get('user').id),
    )
  },
)

userRoutes.patch(
  '/:id',
  requirePermission('users:write'),
  validateUserIdParam,
  validateUpdateUser,
  async (c) => {
    return ok(c, await updateUser(c.req.valid('param').id, c.req.valid('json'), c.get('user').id))
  },
)
