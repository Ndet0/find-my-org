import { auth } from '@opsflow/auth'
import { Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import { isRoleName } from '@opsflow/types/permissions'
import type {
  CreateUserInput,
  CurrentUser,
  RoleRef,
  UpdateUserInput,
  UserDetail,
  UserListItem,
  UserListQuery,
  UserStatus,
} from '@opsflow/types/user'
import { AppError, conflict, forbidden, notFound } from '../lib/errors.js'
import { roleIdByName } from '../lib/roles.js'
import { type EventActor, recordActivity } from './activity.service.js'

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

  return toDetail(row)
}

type DetailRow = Prisma.UserGetPayload<{ select: typeof detailSelect }>

function toDetail(row: DetailRow): UserDetail {
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

/**
 * Provisions an account through Better Auth so the password hash and
 * credential row are written together, then patches the OPSflow profile
 * fields Better Auth will not accept on signup (`input: false`).
 */
export async function createUser(input: CreateUserInput, actor: EventActor): Promise<UserDetail> {
  const taken = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  // Required, not defensive: with `autoSignIn: false` Better Auth answers a
  // duplicate email with a synthetic user instead of an error.
  if (taken) {
    throw conflict('USER_EMAIL_TAKEN', 'A user with that email already exists')
  }

  const roleId = await resolveRoleId(input.role)
  await assertDepartmentExists(input.departmentId)

  let createdId: string

  try {
    const result = await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    })
    createdId = result.user.id
  } catch (error) {
    // Better Auth throws its own APIError. The API does not depend on
    // `better-auth` directly, so this is recognised by shape rather than
    // `instanceof`.
    if (error instanceof Error) {
      throw new AppError('SIGNUP_FAILED', error.message || 'The account could not be created', 400)
    }
    throw error
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: createdId },
      data: {
        roleId,
        departmentId: input.departmentId ?? null,
        position: input.position ?? null,
        phone: input.phone ?? null,
        joinedAt: input.joinedAt ? new Date(input.joinedAt) : new Date(),
        emailVerified: true,
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'created',
      entityType: 'user',
      entityId: updated.id,
      description: `${actor.name} created ${updated.name}`,
    })

    return updated
  })

  return toDetail(row)
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actorId: string,
): Promise<UserDetail> {
  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, role: { select: { name: true } } },
  })

  if (!current) {
    throw notFound('User')
  }

  if (input.role !== undefined && id === actorId) {
    throw forbidden('You cannot change your own role')
  }

  if (input.role !== undefined) {
    await assertNotLastAdmin(id, current, { role: input.role })
  }

  if (input.email && input.email !== current.email) {
    const taken = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    })

    if (taken) {
      throw conflict('USER_EMAIL_TAKEN', 'A user with that email already exists')
    }
  }

  await assertDepartmentExists(input.departmentId)

  const data: Prisma.UserUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.email !== undefined) data.email = input.email
  if (input.position !== undefined) data.position = input.position
  if (input.phone !== undefined) data.phone = input.phone
  if (input.joinedAt !== undefined) {
    data.joinedAt = input.joinedAt ? new Date(input.joinedAt) : null
  }
  if (input.departmentId !== undefined) {
    data.department = input.departmentId
      ? { connect: { id: input.departmentId } }
      : { disconnect: true }
  }
  if (input.role !== undefined) {
    data.role = { connect: { id: await resolveRoleId(input.role) } }
  }

  try {
    const row = await prisma.user.update({ where: { id }, data, select: detailSelect })
    return toDetail(row)
  } catch (error) {
    if (isUniqueOn(error, 'email')) {
      throw conflict('USER_EMAIL_TAKEN', 'A user with that email already exists')
    }
    throw error
  }
}

export async function setUserStatus(
  id: string,
  status: UserStatus,
  actor: EventActor,
): Promise<UserDetail> {
  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, role: { select: { name: true } } },
  })

  if (!current) {
    throw notFound('User')
  }

  if (id === actor.id) {
    throw forbidden('You cannot change your own status')
  }

  await assertNotLastAdmin(id, current, { status })

  return prisma.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id },
      data: { status },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'status_changed',
      entityType: 'user',
      entityId: row.id,
      description: `${actor.name} changed ${row.name} to ${status}`,
      metadata: { old: current.status, new: status },
    })

    return toDetail(row)
  })
}

type AdminGuardRow = { status: UserStatus; role: { name: string } }

/**
 * Demoting or deactivating the last active admin would lock the organisation
 * out of every write. The check is skipped when the target is not currently
 * an active admin, or when the change would leave them as one.
 */
async function assertNotLastAdmin(
  id: string,
  current: AdminGuardRow,
  next: { role?: string; status?: UserStatus },
): Promise<void> {
  if (current.role.name !== 'admin' || current.status !== 'active') {
    return
  }

  const staysAdmin = next.role === undefined || next.role === 'admin'
  const staysActive = next.status === undefined || next.status === 'active'

  if (staysAdmin && staysActive) {
    return
  }

  const remaining = await prisma.user.count({
    where: {
      id: { not: id },
      status: 'active',
      role: { name: 'admin' },
    },
  })

  if (remaining === 0) {
    throw conflict('LAST_ADMIN', 'The organisation must keep at least one active admin')
  }
}

async function resolveRoleId(name: CreateUserInput['role']): Promise<string> {
  const roleId = await roleIdByName(name)

  if (!roleId) {
    throw new AppError('ROLE_NOT_SEEDED', `The "${name}" role does not exist`, 500)
  }

  return roleId
}

async function assertDepartmentExists(departmentId: string | null | undefined): Promise<void> {
  if (!departmentId) {
    return
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  })

  if (!department) {
    throw notFound('Department')
  }
}

function isUniqueOn(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }

  const targets = error.meta?.target
  return Array.isArray(targets) && targets.includes(field)
}
