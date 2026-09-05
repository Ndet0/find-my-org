import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from '../services/department.service.js'
import {
  validateCreateDepartment,
  validateDepartmentIdParam,
  validateUpdateDepartment,
} from '../validators/department.validator.js'

export const departmentRoutes = new Hono<AppEnv>()

departmentRoutes.use('*', requireAuth, requirePermission('departments:read'))

departmentRoutes.get('/', async (c) => {
  return ok(c, await listDepartments())
})

departmentRoutes.post(
  '/',
  requirePermission('departments:write'),
  validateCreateDepartment,
  async (c) => {
    return ok(c, await createDepartment(c.req.valid('json'), eventActor(c)), 201)
  },
)

departmentRoutes.patch(
  '/:id',
  requirePermission('departments:write'),
  validateDepartmentIdParam,
  validateUpdateDepartment,
  async (c) => {
    return ok(
      c,
      await updateDepartment(c.req.valid('param').id, c.req.valid('json'), eventActor(c)),
    )
  },
)

departmentRoutes.delete(
  '/:id',
  requirePermission('departments:write'),
  validateDepartmentIdParam,
  async (c) => {
    return ok(c, await deleteDepartment(c.req.valid('param').id, eventActor(c)))
  },
)
