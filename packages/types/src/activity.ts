import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'
import type { NamedRef } from './user'

/**
 * The entity a log row points at. Stored as VARCHAR in
 * `activity_logs.entity_type` rather than a Prisma enum so a new module
 * does not require a migration just to start writing logs.
 */
export const ACTIVITY_ENTITY_TYPES = ['user', 'department', 'client', 'project', 'task'] as const

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number]

/**
 * The verb recorded on a log row. Closed so the feed can badge actions
 * without parsing free text. Stored as VARCHAR, same reason as entity type.
 */
export const ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'priority_changed',
  'role_changed',
  'assigned',
  'completed',
  'deleted',
  'member_added',
  'member_removed',
  'commented',
  'comment_deleted',
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

/** One row of `GET /api/activity`. */
export type ActivityListItem = {
  id: string
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string | null
  description: string | null
  metadata: unknown
  createdAt: string
  actor: NamedRef | null
}

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

export const activityListQuerySchema = z.object({
  q: optionalText,
  entityType: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
  entityId: optionalText.pipe(z.uuid().optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>

export type ActivityListFilters = Partial<Omit<ActivityListQuery, 'page' | 'pageSize'>> & {
  page?: number
  pageSize?: number
}
