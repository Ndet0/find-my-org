/**
 * Mirrors the `user_status` enum in packages/db/prisma/schema.prisma.
 * It is restated rather than imported because `@opsflow/db` instantiates
 * the Prisma client on import and must never reach a client bundle.
 */
export const USER_STATUSES = ['active', 'inactive', 'suspended'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

/** A related record reduced to what a client needs to display it. */
export type NamedRef = { id: string; name: string }

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
  role: NamedRef
  department: NamedRef | null
}
