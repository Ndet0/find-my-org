import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'
import { PRIORITY_LEVELS, type PriorityLevel } from './project'
import type { NamedRef } from './user'

/**
 * Mirrors the `task_status` enum in packages/db/prisma/schema.prisma.
 * Restated rather than imported: `@opsflow/db` instantiates the Prisma
 * client on import and must never reach a client bundle.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'blocked', 'completed'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

/** One row of `GET /api/tasks`. Trimmed to what the directory table renders. */
export type TaskListItem = {
  id: string
  title: string
  status: TaskStatus
  priority: PriorityLevel
  dueDate: string | null
  project: NamedRef
  assignee: NamedRef | null
}

/** The body of `GET /api/tasks/:id`. */
export type TaskDetail = TaskListItem & {
  description: string | null
  createdAt: string
  completedAt: string | null
  creator: NamedRef | null
}

/**
 * Query parameters for `GET /api/tasks`, shared so the web app builds the
 * query string against the same schema the API validates it with.
 *
 * Everything is optional: an unfiltered first page is a valid request. Empty
 * strings are coerced away because a cleared filter control submits `''`,
 * which should mean "no filter" rather than "match the empty string".
 */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

export const taskListQuerySchema = z.object({
  q: optionalText,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  projectId: optionalText.pipe(z.uuid().optional()),
  assignedTo: optionalText.pipe(z.uuid().optional()),
  overdue: z
    .enum(['true'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type TaskListQuery = z.infer<typeof taskListQuerySchema>

/** The caller-facing form of the query, before defaults are applied. */
export type TaskListFilters = Partial<Omit<TaskListQuery, 'page' | 'pageSize' | 'overdue'>> & {
  page?: number
  pageSize?: number
  overdue?: boolean | 'true'
}

/**
 * An optional text column. A cleared input submits `''`, which means "no
 * value" rather than "the empty string", so it becomes `null`. On a PATCH
 * that gives the two states apart: `undefined` leaves the column alone,
 * `null` clears it.
 */
const optionalField = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()

const optionalId = (label: string) => z.uuid(`Choose a valid ${label}`).nullable().optional()

const optionalDate = z.iso.date('Enter a valid date').nullable().optional()

/** Bounds mirror the `@db.VarChar` widths in packages/db/prisma/schema.prisma. */
const title = z
  .string()
  .trim()
  .min(1, 'Enter a title')
  .max(200, 'A title must be 200 characters or fewer')

const description = optionalField(5000, 'A description')

/**
 * The body of `POST /api/tasks`.
 *
 * Status is not here: a new task is always `pending`. Changing status is a
 * distinct action with its own confirmation rather than a field on the form.
 * `createdBy` is taken from the session, not the client.
 */
export const createTaskSchema = z.object({
  title,
  description,
  projectId: z.uuid('Choose a valid project'),
  assignedTo: optionalId('assignee'),
  priority: z.enum(PRIORITY_LEVELS).default('medium'),
  dueDate: optionalDate,
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

/**
 * The body of `PATCH /api/tasks/:id`.
 *
 * Status and priority are not here: they have their own endpoints, because
 * they are controls on the task page rather than fields on the edit form.
 * A task always belongs to a project, so `projectId` cannot be cleared.
 */
export const updateTaskSchema = z
  .object({
    title,
    description,
    projectId: z.uuid('Choose a valid project'),
    assignedTo: optionalId('assignee'),
    dueDate: optionalDate,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  })

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

/** The body of `PATCH /api/tasks/:id/status`. */
export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
})

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>

/** The body of `PATCH /api/tasks/:id/priority`. */
export const updateTaskPrioritySchema = z.object({
  priority: z.enum(PRIORITY_LEVELS),
})

export type UpdateTaskPriorityInput = z.infer<typeof updateTaskPrioritySchema>

/**
 * The task lifecycle from product_architecture.md §21:
 *
 * ```text
 * pending → in_progress → completed
 *                ↓
 *             blocked
 * ```
 *
 * Enforced in the task service and mirrored by the clients, so a status
 * control only offers moves the API will accept.
 *
 * Two recoveries the product document does not draw are allowed, because
 * each corrects a mistake rather than skipping a step: un-starting a task
 * back to `pending`, and reopening a completed one. What stays closed is
 * skipping the work — `pending` cannot jump straight to `completed` or
 * `blocked`, and a `blocked` task cannot complete without passing back
 * through `in_progress`.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['pending', 'blocked', 'completed'],
  blocked: ['in_progress'],
  completed: ['in_progress'],
}

/** The statuses a task currently in `from` may move to. */
export function nextTaskStatuses(from: TaskStatus): readonly TaskStatus[] {
  return TASK_TRANSITIONS[from]
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to)
}

/** `in_progress` reads badly in a sentence; every caller wants "in progress". */
export function taskStatusText(status: TaskStatus): string {
  return status.replaceAll('_', ' ')
}
