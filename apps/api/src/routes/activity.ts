import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import { listActivity } from '../services/activity.service.js'
import { validateActivityListQuery } from '../validators/activity.validator.js'

export const activityRoutes = new Hono<AppEnv>()

activityRoutes.use('*', requireAuth, requirePermission('activity:read'))

activityRoutes.get('/', validateActivityListQuery, async (c) => {
  return ok(c, await listActivity(c.req.valid('query'), eventActor(c)))
})
