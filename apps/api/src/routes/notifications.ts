import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '../services/notification.service.js'
import {
  validateNotificationIdParam,
  validateNotificationListQuery,
} from '../validators/notification.validator.js'

export const notificationRoutes = new Hono<AppEnv>()

notificationRoutes.use('*', requireAuth, requirePermission('notifications:read'))

notificationRoutes.get('/', validateNotificationListQuery, async (c) => {
  return ok(c, await listNotifications(c.req.valid('query'), c.get('user').id))
})

notificationRoutes.get('/unread-count', async (c) => {
  return ok(c, await unreadCount(c.get('user').id))
})

notificationRoutes.post('/read-all', async (c) => {
  return ok(c, await markAllRead(c.get('user').id))
})

notificationRoutes.patch('/:id/read', validateNotificationIdParam, async (c) => {
  return ok(c, await markRead(c.req.valid('param').id, c.get('user').id))
})
