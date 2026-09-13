import { type Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import type {
  NotificationListItem,
  NotificationListQuery,
  NotificationType,
  NotificationUnreadCount,
} from '@opsflow/types/notification'
import { notFound } from '../lib/errors.js'
import type { DbClient } from './activity.service.js'

const listSelect = {
  id: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect

type ListRow = Prisma.NotificationGetPayload<{ select: typeof listSelect }>

function toListItem(row: ListRow): NotificationListItem {
  const { createdAt, ...notification } = row
  return { ...notification, createdAt: createdAt.toISOString() }
}

function buildWhere(query: NotificationListQuery, userId: string): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = { userId }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { message: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  if (query.unread) {
    where.isRead = false
  }

  return where
}

export async function listNotifications(
  query: NotificationListQuery,
  userId: string,
): Promise<Paginated<NotificationListItem>> {
  const where = buildWhere(query, userId)

  const [rows, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: listSelect,
      // Rows written in one transaction share `createdAt`, so `id` breaks the
      // tie. It is uuid(7), so id-desc continues createdAt-desc.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where }),
  ])

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function unreadCount(userId: string): Promise<NotificationUnreadCount> {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  })

  return { count }
}

export async function markRead(id: string, userId: string): Promise<NotificationListItem> {
  const current = await prisma.notification.findFirst({
    where: { id, userId },
    select: listSelect,
  })

  if (!current) {
    throw notFound('Notification')
  }

  if (current.isRead) {
    return toListItem(current)
  }

  const row = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: listSelect,
  })

  return toListItem(row)
}

export async function markAllRead(userId: string): Promise<NotificationUnreadCount> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })

  return { count: 0 }
}

export type NotifyInput = {
  userId: string | null | undefined
  actorId: string
  title: string
  message: string
  type: NotificationType
}

/**
 * Raises a notification unless the recipient is missing or is the actor.
 * The actor already knows they performed the action; telling them so is noise.
 */
export async function notify(db: DbClient, input: NotifyInput): Promise<void> {
  if (!input.userId || input.userId === input.actorId) {
    return
  }

  await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
    },
  })
}
