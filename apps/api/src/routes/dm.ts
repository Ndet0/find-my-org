import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getConversation,
  getOwnKey,
  listContacts,
  listConversations,
  listMessages,
  markConversationRead,
  openConversation,
  putOwnKey,
  sendMessage,
  unreadCount,
} from '../services/dm.service.js'
import {
  validateCreateDmConversation,
  validateDmContactsQuery,
  validateDmConversationIdParam,
  validateDmKey,
  validateDmMessageListQuery,
  validateSendDmMessage,
} from '../validators/dm.validator.js'

/**
 * Direct messages. Authenticated but not permission-gated, like `/me`:
 * every active person may write to a colleague. The one rule — who may
 * reach whom — is row-level and lives in the service, as
 * `canDirectMessage` in `@opsflow/types/dm`.
 */
export const dmRoutes = new Hono<AppEnv>()

dmRoutes.use('*', requireAuth)

dmRoutes.get('/key', async (c) => {
  return ok(c, await getOwnKey(c.get('user').id))
})

dmRoutes.put('/key', validateDmKey, async (c) => {
  return ok(c, await putOwnKey(c.req.valid('json'), c.get('user').id))
})

dmRoutes.get('/contacts', validateDmContactsQuery, async (c) => {
  return ok(c, await listContacts(c.req.valid('query'), eventActor(c)))
})

dmRoutes.get('/unread-count', async (c) => {
  return ok(c, await unreadCount(eventActor(c)))
})

dmRoutes.get('/conversations', async (c) => {
  return ok(c, await listConversations(eventActor(c)))
})

dmRoutes.post('/conversations', validateCreateDmConversation, async (c) => {
  return ok(c, await openConversation(c.req.valid('json'), eventActor(c)), 201)
})

dmRoutes.get('/conversations/:id', validateDmConversationIdParam, async (c) => {
  return ok(c, await getConversation(c.req.valid('param').id, eventActor(c)))
})

dmRoutes.get(
  '/conversations/:id/messages',
  validateDmConversationIdParam,
  validateDmMessageListQuery,
  async (c) => {
    return ok(c, await listMessages(c.req.valid('param').id, c.req.valid('query'), eventActor(c)))
  },
)

dmRoutes.post(
  '/conversations/:id/messages',
  validateDmConversationIdParam,
  validateSendDmMessage,
  async (c) => {
    return ok(
      c,
      await sendMessage(c.req.valid('param').id, c.req.valid('json'), eventActor(c)),
      201,
    )
  },
)

dmRoutes.post('/conversations/:id/read', validateDmConversationIdParam, async (c) => {
  return ok(c, await markConversationRead(c.req.valid('param').id, eventActor(c)))
})
