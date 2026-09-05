import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  createClient,
  getClient,
  listClients,
  setClientStatus,
  updateClient,
} from '../services/client.service.js'
import {
  validateClientIdParam,
  validateClientListQuery,
  validateCreateClient,
  validateUpdateClient,
  validateUpdateClientStatus,
} from '../validators/client.validator.js'

export const clientRoutes = new Hono<AppEnv>()

clientRoutes.use('*', requireAuth, requirePermission('clients:read'))

clientRoutes.get('/', validateClientListQuery, async (c) => {
  return ok(c, await listClients(c.req.valid('query')))
})

clientRoutes.post('/', requirePermission('clients:write'), validateCreateClient, async (c) => {
  return ok(c, await createClient(c.req.valid('json'), eventActor(c)), 201)
})

clientRoutes.get('/:id', validateClientIdParam, async (c) => {
  return ok(c, await getClient(c.req.valid('param').id))
})

clientRoutes.patch(
  '/:id/status',
  requirePermission('clients:write'),
  validateClientIdParam,
  validateUpdateClientStatus,
  async (c) => {
    return ok(
      c,
      await setClientStatus(c.req.valid('param').id, c.req.valid('json').status, eventActor(c)),
    )
  },
)

clientRoutes.patch(
  '/:id',
  requirePermission('clients:write'),
  validateClientIdParam,
  validateUpdateClient,
  async (c) => {
    return ok(c, await updateClient(c.req.valid('param').id, c.req.valid('json'), eventActor(c)))
  },
)
