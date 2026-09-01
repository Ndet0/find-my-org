import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'
import { ROLE_NAMES, type RoleName } from './permissions'

/**
 * Mirrors the `user_status` enum in packages/db/prisma/schema.prisma.
 * It is restated rather than imported because `@opsflow/db` instantiates
 * the Prisma client on import and must never reach a client bundle.
 */
export const USER_STATUSES = ['active', 'inactive', 'suspended'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

/** A related record reduced to what a client needs to display it. */
export type NamedRef = { id: string; name: string }

/** The user's role, carrying the name the permission matrix is keyed by. */
export type RoleRef = { id: string; name: RoleName }

/**
 * The body of `GET /api/me`.
 *
 * This is the wire shape, after JSON serialisation, so `joinedAt` is an
 * ISO date string rather than the `Date` that Prisma returns.
 */
export type CurrentUser = {
  id: string
  name: string
  email: string
  phone: string | null
  position: string | null
  avatarUrl: string | null
  status: UserStatus
  joinedAt: string | null
  role: RoleRef
  department: NamedRef | null
}

/** One row of `GET /api/users`. Trimmed to what the directory table renders. */
export type UserListItem = {
  id: string
  name: string
  email: string
  position: string | null
  status: UserStatus
  role: RoleRef
  department: NamedRef | null
}

/** The body of `GET /api/users/:id`. */
export type UserDetail = UserListItem & {
  phone: string | null
  avatarUrl: string | null
  joinedAt: string | null
  createdAt: string
}

/**
 * Query parameters for `GET /api/users`, shared so the web app builds the
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

export const userListQuerySchema = z.object({
  q: optionalText,
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(ROLE_NAMES).optional(),
  departmentId: optionalText.pipe(z.uuid().optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type UserListQuery = z.infer<typeof userListQuerySchema>

/** The caller-facing form of the query, before defaults are applied. */
export type UserListFilters = Partial<Omit<UserListQuery, 'page' | 'pageSize'>> & {
  page?: number
  pageSize?: number
}
