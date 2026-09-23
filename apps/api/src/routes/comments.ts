import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { deleteComment } from '../services/comment.service.js'
import { validateCommentIdParam } from '../validators/comment.validator.js'

/**
 * Threads are read and written through their parent (`/tasks/:id/comments`,
 * `/projects/:id/comments`), which is where the read permission lives. A
 * list item only carries its own id, so deletion is addressed directly;
 * the service still checks that the actor may see the parent.
 */
export const commentRoutes = new Hono<AppEnv>()

commentRoutes.use('*', requireAuth)

commentRoutes.delete('/:id', validateCommentIdParam, async (c) => {
  return ok(c, await deleteComment(c.req.valid('param').id, eventActor(c)))
})
