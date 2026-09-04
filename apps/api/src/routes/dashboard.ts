import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { getDashboardStats } from '../services/dashboard.service.js'

export const dashboardRoutes = new Hono<AppEnv>()

dashboardRoutes.use('*', requireAuth, requirePermission('dashboard:read'))

dashboardRoutes.get('/', async (c) => {
  return ok(c, await getDashboardStats(eventActor(c)))
})
