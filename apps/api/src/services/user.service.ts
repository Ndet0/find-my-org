import { type Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import { isRoleName } from '@opsflow/types/permissions'
import type {
  CurrentUser,
  RoleRef,
  UserDetail,
  UserListItem,
  UserListQuery,
} from '@opsflow/types/user'
import { notFound } from '../lib/errors.js'

/**
 * The columns every user-shaped response needs. Declared once so the list
 * and detail queries cannot drift apart, and so the role and department
 * names arrive in the same round trip rather than one query per row.
 */
const listSelect = {
  id: true,
  name: true,
  email: true,
  position: true,
  status: true,
  role: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect

const detailSelect = {
  ...listSelect,
  phone: true,
  avatarUrl: true,
  joinedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect

type RoleRow = { id: string; name: string }

/**
 * The database can hold a role the permission matrix does not know about,
 * so the name is narrowed rather than cast. An unrecognised role is reported
 * as `employee`, the least-privileged option, because this value reaches the
 * client and drives which controls it offers.
 */
function toRoleRef(role: RoleRow): RoleRef {
  return { id: role.id, name: isRoleName(role.name) ? role.name : 'employee' }
}

/** Dates cross the wire as date-only strings, not full timestamps. */
function toDateString(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null
}

function buildWhere(query: UserListQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  if (query.status) {
    where.status = query.status
  }

  if (query.role) {
    where.role = { name: query.role }
  }

  if (query.departmentId) {
    where.departmentId = query.departmentId
  }

  return where
}

export async function listUsers(query: UserListQuery): Promise<Paginated<UserListItem>> {
  const where = buildWhere(query)

  // One transaction so the page and the total describe the same snapshot;
  // separately they can disagree when rows are written between the queries.
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: listSelect,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    items: rows.map((row) => ({ ...row, role: toRoleRef(row.role) })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getUser(id: string): Promise<UserDetail> {
  const row = await prisma.user.findUnique({ where: { id }, select: detailSelect })

  if (!row) {
    throw notFound('User')
  }

  return {
    ...row,
    role: toRoleRef(row.role),
    joinedAt: toDateString(row.joinedAt),
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * The signed-in user's own profile. Kept beside the directory queries
 * because it reads the same table, but it is not permission-gated: every
 * authenticated user may read themselves.
 */
export async function getCurrentUser(id: string): Promise<CurrentUser> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      ...listSelect,
      phone: true,
      avatarUrl: true,
      joinedAt: true,
    },
  })

  if (!row) {
    throw notFound('User')
  }

  return {
    ...row,
    role: toRoleRef(row.role),
    joinedAt: toDateString(row.joinedAt),
  }
}
