import { prisma } from '@opsflow/db'
import type { CurrentUser } from '@opsflow/types/user'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { notFound } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'

export const meRoutes = new Hono<AppEnv>()

meRoutes.use('*', requireAuth)

/**
 * The signed-in user's profile, joined with the role and department names
 * that clients need for navigation and permission-aware UI. The session
 * carries only ids.
 */
meRoutes.get('/', async (c) => {
  const { id } = c.get('user')

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      position: true,
      avatarUrl: true,
      status: true,
      joinedAt: true,
      role: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  })

  if (!user) {
    throw notFound('User')
  }

  // Spelled out rather than returned directly so the compiler checks the
  // row against the contract clients consume, and so `joinedAt` crosses
  // the wire as a date-only string instead of a full timestamp.
  const body: CurrentUser = {
    ...user,
    joinedAt: user.joinedAt?.toISOString().slice(0, 10) ?? null,
  }

  return ok(c, body)
})
