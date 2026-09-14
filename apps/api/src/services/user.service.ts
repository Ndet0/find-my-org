import { APIError, auth } from '@opsflow/auth'
import { Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import { isRoleName } from '@opsflow/types/permissions'
import type {
  CreateUserInput,
  CurrentUser,
  RoleRef,
  UpdateProfileInput,
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

/** What `/api/me` returns: the list columns plus the personal ones. */
const currentSelect = {
  ...listSelect,
  phone: true,
  avatarUrl: true,
  joinedAt: true,
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

function toCurrentUser(row: Prisma.UserGetPayload<{ select: typeof currentSelect }>): CurrentUser {
  return {
    ...row,
    role: toRoleRef(row.role),
    joinedAt: toDateString(row.joinedAt),
  }
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
      // Two people can share a name, so `id` breaks the tie and makes the
      // page boundaries stable.
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
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
  const row = await prisma.user.findUnique({ where: { id }, select: currentSelect })

  if (!row) {
    throw notFound('User')
  }

  return toCurrentUser(row)
}

/**
 * Self-service edit of the caller's own profile. Only name, position and
 * phone are accepted, so none of the guards in `updateUser` apply: a person
 * cannot reach their own role, status or email from here. Logged like every
 * other write so the trail shows who changed what, even about themselves.
 */
export async function updateProfile(
  input: UpdateProfileInput,
  actor: EventActor,
): Promise<CurrentUser> {
  const data: Prisma.UserUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.phone !== undefined) data.phone = input.phone

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: actor.id }, data, select: currentSelect })

    await recordActivity(tx, {
      actor,
      action: 'updated',
      entityType: 'user',
      entityId: updated.id,
      description: `${updated.name} updated their profile`,
    })

    return updated
  })

  return toCurrentUser(row)
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
    // Only Better Auth refusing the request is the caller's problem. A
    // database fault inside the call is a 500 like anywhere else, and its
    // message stays on the server (middleware/error.ts).
    if (error instanceof APIError) {
      throw new AppError('SIGNUP_FAILED', error.message || 'The account could not be created', 400)
    }
    throw error
  }

  // Better Auth has committed the user and its credential; the OPSflow
  // profile is a second write. If it fails, the half-made account — default
  // role, no department, no activity row — is removed rather than left to
  // answer the next attempt with "that email already exists".
  try {
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
  } catch (error) {
    await prisma.user.delete({ where: { id: createdId } }).catch((cleanupError: unknown) => {
      console.error(`[users] could not remove half-created user ${createdId}`, cleanupError)
    })
    throw error
  }
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: EventActor,
): Promise<UserDetail> {
  const actorId = actor.id
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
    await assertNoManagedProjects(id, current.role.name, input.role)
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
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data, select: detailSelect })

      await recordActivity(tx, {
        actor,
        action: input.role !== undefined ? 'role_changed' : 'updated',
        entityType: 'user',
        entityId: updated.id,
        description:
          input.role !== undefined
            ? `${actor.name} changed ${updated.name}'s role to ${input.role}`
            : `${actor.name} updated ${updated.name}`,
        metadata:
          input.role !== undefined ? { old: current.role.name, new: input.role } : undefined,
      })

      return updated
    })
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

  const leaving = status !== 'active' && current.status === 'active'

  if (leaving) {
    await assertNoOpenWork(id)
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id },
      data: { status },
      select: detailSelect,
    })

    // `requireAuth` already refuses a non-active user on every OPSflow route,
    // but Better Auth's own endpoints — change-password, list-sessions — sit
    // in front of it and know nothing about `status`. Dropping the sessions
    // closes that door too, and means "signed out" is literally true.
    if (leaving) {
      await tx.session.deleteMany({ where: { userId: id } })
    }

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

/**
 * Every other path keeps a project's manager an active admin or manager and
 * a task's assignee an active person on the project; taking someone out of
 * service must not be the one path that breaks those. Their open work has to
 * be handed on first, the same rule `removeProjectMember` applies. Completed
 * tasks and closed projects are history and stay with them.
 */
async function assertNoOpenWork(userId: string): Promise<void> {
  const [projects, tasks] = await prisma.$transaction([
    prisma.project.count({
      where: { managerId: userId, status: { notIn: ['completed', 'cancelled'] } },
    }),
    prisma.task.count({ where: { assignedTo: userId, status: { not: 'completed' } } }),
  ])

  if (projects > 0 || tasks > 0) {
    throw conflict(
      'USER_HAS_OPEN_WORK',
      `Reassign ${describeOpenWork(projects, tasks)} held by this person first`,
    )
  }
}

/**
 * A project manager must be an admin or a manager. Demoting one to employee
 * would leave their open projects with a manager no other path could set,
 * and keep them fully visible to someone who should now see only their own.
 */
async function assertNoManagedProjects(
  userId: string,
  currentRole: string,
  nextRole: string,
): Promise<void> {
  const eligible = (role: string) => role === 'admin' || role === 'manager'

  if (!eligible(currentRole) || eligible(nextRole)) {
    return
  }

  const projects = await prisma.project.count({
    where: { managerId: userId, status: { notIn: ['completed', 'cancelled'] } },
  })

  if (projects > 0) {
    throw conflict(
      'USER_HAS_OPEN_WORK',
      `Reassign ${describeOpenWork(projects, 0)} managed by this person before changing their role`,
    )
  }
}

function describeOpenWork(projects: number, tasks: number): string {
  const parts: string[] = []

  if (projects > 0) {
    parts.push(`${projects} open ${projects === 1 ? 'project' : 'projects'}`)
  }

  if (tasks > 0) {
    parts.push(`${tasks} open ${tasks === 1 ? 'task' : 'tasks'}`)
  }

  return parts.join(' and ')
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
