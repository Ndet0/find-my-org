import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'

/**
 * Mirrors the `notification_type` enum in packages/db/prisma/schema.prisma.
 * Restated rather than imported: `@opsflow/db` instantiates the Prisma
 * client on import and must never reach a client bundle.
 */
export const NOTIFICATION_TYPES = ['task', 'project', 'user', 'system'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** One row of `GET /api/notifications`. */
export type NotificationListItem = {
  id: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  createdAt: string
}

/** The body of `GET /api/notifications/unread-count`. */
export type NotificationUnreadCount = {
  count: number
}

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

export const notificationListQuerySchema = z.object({
  q: optionalText,
  unread: z
    .enum(['true'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>

export type NotificationListFilters = Partial<
  Omit<NotificationListQuery, 'page' | 'pageSize' | 'unread'>
> & {
  page?: number
  pageSize?: number
  unread?: boolean | 'true'
}
