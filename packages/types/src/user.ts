import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth'
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

/**
 * An optional profile field, bounded to its column width.
 *
 * A cleared input submits `''`, which means "no value" rather than "the empty
 * string", so it becomes `null`. On a PATCH that gives the two states apart:
 * `undefined` leaves the column alone, `null` clears it.
 */
const optionalProfileField = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()

/** Bounds mirror the `@db.VarChar` widths in packages/db/prisma/schema.prisma. */
const name = z
  .string()
  .trim()
  .min(1, 'Enter a name')
  .max(150, 'A name must be 150 characters or fewer')

const email = z
  .email('Enter a valid email address')
  .max(255, 'An email must be 255 characters or fewer')
  // Better Auth lowercases on sign-up and looks up the normalised form on
  // sign-in, so anything written here has to match that.
  .toLowerCase()

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `A password must be ${PASSWORD_MAX_LENGTH} characters or fewer`)

/** Roles are chosen by name: the permission matrix is keyed by it, and it
 *  keeps opaque role ids out of the request. */
const role = z.enum(ROLE_NAMES)

const departmentId = z.uuid('Choose a valid department').nullable().optional()

const position = optionalProfileField(100, 'A position')
const phone = optionalProfileField(30, 'A phone number')
const joinedAt = z.iso.date('Enter a valid date').nullable().optional()

/**
 * The body of `POST /api/users`.
 *
 * Admins provision accounts; there is no public signup and no invitation
 * email in the MVP, so the initial password is set here and handed over
 * out of band.
 */
export const createUserSchema = z.object({
  name,
  email,
  password,
  role,
  departmentId,
  position,
  phone,
  joinedAt,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

/**
 * The body of `PATCH /api/users/:id`.
 *
 * Status is not here: it has its own endpoint, because deactivating someone
 * is a distinct action with its own confirmation rather than one more field
 * on a profile form. Passwords are not here either — changing one is an
 * account operation, not a profile edit.
 */
export const updateUserSchema = z
  .object({
    name,
    email,
    role,
    departmentId,
    position,
    phone,
    joinedAt,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  })

export type UpdateUserInput = z.infer<typeof updateUserSchema>

/**
 * The body of `PATCH /api/me`: the fields a person may change about
 * themselves. Email, role, department and status stay on the admin
 * endpoints, and passwords are an account operation, not a profile edit.
 */
export const updateProfileSchema = z
  .object({
    name,
    position,
    phone,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/** The body of `PATCH /api/users/:id/status`. */
export const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
})

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
