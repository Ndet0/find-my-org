import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { listDepartments } from '../services/department.service.js'

export const departmentRoutes = new Hono<AppEnv>()

departmentRoutes.use('*', requireAuth, requirePermission('departments:read'))

departmentRoutes.get('/', async (c) => {
  return ok(c, await listDepartments())
})
