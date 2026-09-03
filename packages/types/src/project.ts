import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'
import type { NamedRef } from './user'

/**
 * Mirrors the `project_status` and `priority_level` enums in
 * packages/db/prisma/schema.prisma. Restated rather than imported:
 * `@opsflow/db` instantiates the Prisma client on import and must never
 * reach a client bundle.
 */
export const PROJECT_STATUSES = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'delayed',
  'cancelled',
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const

export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

/** A person on a project, reduced to what the member list renders. */
export type ProjectMember = {
  id: string
  user: NamedRef
}

/** One row of `GET /api/projects`. Trimmed to what the directory table renders. */
export type ProjectListItem = {
  id: string
  name: string
  status: ProjectStatus
  priority: PriorityLevel
  progress: number
  deadline: string | null
  client: NamedRef | null
  manager: NamedRef | null
  memberCount: number
}

/** The body of `GET /api/projects/:id`. */
export type ProjectDetail = ProjectListItem & {
  description: string | null
  startDate: string | null
  createdAt: string
  members: ProjectMember[]
  taskCount: number
}

/**
 * Query parameters for `GET /api/projects`, shared so the web app builds the
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

export const projectListQuerySchema = z.object({
  q: optionalText,
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  clientId: optionalText.pipe(z.uuid().optional()),
  managerId: optionalText.pipe(z.uuid().optional()),
  overdue: z
    .enum(['true'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>

/** The caller-facing form of the query, before defaults are applied. */
export type ProjectListFilters = Partial<
  Omit<ProjectListQuery, 'page' | 'pageSize' | 'overdue'>
> & {
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
const name = z
  .string()
  .trim()
  .min(1, 'Enter a name')
  .max(200, 'A name must be 200 characters or fewer')

const description = optionalField(5000, 'A description')

function deadlineNotBeforeStart(body: {
  startDate?: string | null
  deadline?: string | null
}): boolean {
  if (body.startDate && body.deadline) {
    return body.deadline >= body.startDate
  }

  return true
}

const datesMessage = {
  message: 'The deadline must be on or after the start date',
  path: ['deadline'],
}

/**
 * The body of `POST /api/projects`.
 *
 * Status is not here: a new project is always `planning`. Changing status
 * is a distinct action with its own confirmation rather than a field on
 * the form. Progress starts at 0; it is edited later, not invented here.
 */
export const createProjectSchema = z
  .object({
    name,
    description,
    clientId: optionalId('client'),
    managerId: optionalId('manager'),
    priority: z.enum(PRIORITY_LEVELS).default('medium'),
    startDate: optionalDate,
    deadline: optionalDate,
  })
  .refine(deadlineNotBeforeStart, datesMessage)

export type CreateProjectInput = z.infer<typeof createProjectSchema>

/**
 * The body of `PATCH /api/projects/:id`.
 *
 * Status and priority are not here: they have their own endpoints, because
 * they are controls on the project page rather than fields on the edit form.
 */
export const updateProjectSchema = z
  .object({
    name,
    description,
    clientId: optionalId('client'),
    managerId: optionalId('manager'),
    progress: z.coerce.number().int().min(0).max(100),
    startDate: optionalDate,
    deadline: optionalDate,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  })
  .refine(deadlineNotBeforeStart, datesMessage)

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

/** The body of `PATCH /api/projects/:id/status`. */
export const updateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
})

export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>

/** The body of `PATCH /api/projects/:id/priority`. */
export const updateProjectPrioritySchema = z.object({
  priority: z.enum(PRIORITY_LEVELS),
})

export type UpdateProjectPriorityInput = z.infer<typeof updateProjectPrioritySchema>

/** The body of `POST /api/projects/:id/members`. */
export const addProjectMemberSchema = z.object({
  userId: z.uuid('Choose a valid person'),
})

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>
