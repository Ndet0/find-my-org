import { Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import type { RoleName } from '@opsflow/types/permissions'
import {
  type AddProjectMemberInput,
  type CreateProjectInput,
  canTransitionProject,
  type PriorityLevel,
  type ProjectDetail,
  type ProjectListItem,
  type ProjectListQuery,
  type ProjectStatus,
  projectStatusText,
  type UpdateProjectInput,
} from '@opsflow/types/project'
import type { NamedRef } from '@opsflow/types/user'
import { utcToday } from '../lib/dates.js'
import { AppError, conflict, notFound } from '../lib/errors.js'
import { type EventActor, recordActivity } from './activity.service.js'
import { notify } from './notification.service.js'

export type ProjectActor = {
  id: string
  role: RoleName
}

/**
 * The columns every project-shaped response needs. Declared once so the list
 * and detail queries cannot drift apart, and so client, manager and member
 * counts arrive in the same round trip rather than one query per row.
 */
const listSelect = {
  id: true,
  name: true,
  status: true,
  priority: true,
  progress: true,
  deadline: true,
  client: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
  _count: { select: { members: true } },
} satisfies Prisma.ProjectSelect

const detailSelect = {
  ...listSelect,
  description: true,
  startDate: true,
  createdAt: true,
  members: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  },
  _count: { select: { members: true, tasks: true } },
} satisfies Prisma.ProjectSelect

type ListRow = Prisma.ProjectGetPayload<{ select: typeof listSelect }>
type DetailRow = Prisma.ProjectGetPayload<{ select: typeof detailSelect }>

/** Dates cross the wire as date-only strings, not full timestamps. */
function toDateString(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null
}

function toNamedRef(row: { id: string; name: string } | null): NamedRef | null {
  return row
}

function toListItem(row: ListRow): ProjectListItem {
  const { _count, deadline, client, manager, ...project } = row
  return {
    ...project,
    deadline: toDateString(deadline),
    client: toNamedRef(client),
    manager: toNamedRef(manager),
    memberCount: _count.members,
  }
}

function toDetail(row: DetailRow): ProjectDetail {
  const { _count, deadline, startDate, createdAt, client, manager, members, ...project } = row
  return {
    ...project,
    deadline: toDateString(deadline),
    startDate: toDateString(startDate),
    createdAt: createdAt.toISOString(),
    client: toNamedRef(client),
    manager: toNamedRef(manager),
    members,
    memberCount: _count.members,
    taskCount: _count.tasks,
  }
}

/**
 * An employee may only see projects they manage or belong to. Admin and
 * manager see the whole table. Misses are 404 rather than 403 so the
 * existence of a hidden row is not advertised.
 */
export function projectVisibilityWhere(actor: ProjectActor): Prisma.ProjectWhereInput {
  if (actor.role !== 'employee') {
    return {}
  }

  return {
    OR: [{ managerId: actor.id }, { members: { some: { userId: actor.id } } }],
  }
}

function buildWhere(query: ProjectListQuery, actor: ProjectActor): Prisma.ProjectWhereInput {
  const filters: Prisma.ProjectWhereInput = {}

  if (query.q) {
    filters.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  if (query.status) {
    filters.status = query.status
  }

  if (query.priority) {
    filters.priority = query.priority
  }

  if (query.clientId) {
    filters.clientId = query.clientId
  }

  if (query.managerId) {
    filters.managerId = query.managerId
  }

  if (query.overdue) {
    const today = utcToday()
    filters.deadline = { lt: today }
    filters.status = query.status
      ? query.status
      : { notIn: ['completed', 'cancelled'] satisfies ProjectStatus[] }
  }

  const visibility = projectVisibilityWhere(actor)

  if (!Object.keys(visibility).length) {
    return filters
  }

  return { AND: [visibility, filters] }
}

export async function listProjects(
  query: ProjectListQuery,
  actor: ProjectActor,
): Promise<Paginated<ProjectListItem>> {
  const where = buildWhere(query, actor)

  const [rows, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      select: listSelect,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.project.count({ where }),
  ])

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getProject(id: string, actor: ProjectActor): Promise<ProjectDetail> {
  const row = await prisma.project.findFirst({
    where: { id, ...projectVisibilityWhere(actor) },
    select: detailSelect,
  })

  if (!row) {
    throw notFound('Project')
  }

  return toDetail(row)
}

export async function createProject(
  input: CreateProjectInput,
  actor: EventActor,
): Promise<ProjectDetail> {
  await assertClientAssignable(input.clientId)
  await assertManagerEligible(input.managerId)

  return prisma.$transaction(async (tx) => {
    const row = await tx.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        priority: input.priority,
        startDate: toDate(input.startDate),
        deadline: toDate(input.deadline),
        client: input.clientId ? { connect: { id: input.clientId } } : undefined,
        manager: input.managerId ? { connect: { id: input.managerId } } : undefined,
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'created',
      entityType: 'project',
      entityId: row.id,
      description: `${actor.name} created "${row.name}"`,
    })
    await notify(tx, {
      userId: input.managerId,
      actorId: actor.id,
      title: 'Project created',
      message: `${actor.name} created "${row.name}" and assigned you as manager`,
      type: 'project',
    })

    return toDetail(row)
  })
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  actor: EventActor,
): Promise<ProjectDetail> {
  const current = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, startDate: true, deadline: true, managerId: true },
  })

  if (!current) {
    throw notFound('Project')
  }

  // Handing the project to someone else takes the old manager off it. Their
  // open tasks would then sit with a person who is neither manager nor member,
  // which no other path allows, so the tasks have to be reassigned first
  // unless they stay on as a member.
  if (
    input.managerId !== undefined &&
    input.managerId !== current.managerId &&
    current.managerId &&
    !(await isMember(id, current.managerId))
  ) {
    await assertNoOpenTasks(id, current.managerId, 'the previous manager')
  }

  assertDeadlineNotBeforeStart(
    input.startDate !== undefined ? input.startDate : toDateString(current.startDate),
    input.deadline !== undefined ? input.deadline : toDateString(current.deadline),
  )

  if (input.clientId !== undefined) {
    await assertClientAssignable(input.clientId)
  }

  if (input.managerId !== undefined) {
    await assertManagerEligible(input.managerId)
  }

  const data: Prisma.ProjectUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.progress !== undefined) data.progress = input.progress
  if (input.startDate !== undefined) data.startDate = toDate(input.startDate)
  if (input.deadline !== undefined) data.deadline = toDate(input.deadline)
  if (input.clientId !== undefined) {
    data.client = input.clientId ? { connect: { id: input.clientId } } : { disconnect: true }
  }
  if (input.managerId !== undefined) {
    data.manager = input.managerId ? { connect: { id: input.managerId } } : { disconnect: true }
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.project.update({
      where: { id },
      data,
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'updated',
      entityType: 'project',
      entityId: row.id,
      description: `${actor.name} updated "${row.name}"`,
    })

    return toDetail(row)
  })
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
  actor: EventActor,
): Promise<ProjectDetail> {
  const current = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      managerId: true,
      members: { select: { userId: true } },
    },
  })

  if (!current) {
    throw notFound('Project')
  }

  assertProjectTransition(current.status, status)

  const recipients = new Set(
    [current.managerId, ...current.members.map((member) => member.userId)].filter(
      (userId): userId is string => Boolean(userId),
    ),
  )

  return prisma.$transaction(async (tx) => {
    const row = await tx.project.update({
      where: { id },
      data: {
        status,
        // A completed project reading 60% is a contradiction the dashboard
        // would then average into its progress figures. Reopening does not
        // reverse it: the number is edited back with the rest of the plan.
        ...(status === 'completed' ? { progress: 100 } : {}),
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'status_changed',
      entityType: 'project',
      entityId: row.id,
      description: `${actor.name} changed "${row.name}" to ${projectStatusText(status)}`,
      metadata: { old: current.status, new: status },
    })

    for (const userId of recipients) {
      await notify(tx, {
        userId,
        actorId: actor.id,
        title: 'Project status changed',
        message: `${actor.name} changed "${row.name}" to ${projectStatusText(status)}`,
        type: 'project',
      })
    }

    return toDetail(row)
  })
}

export async function setProjectPriority(
  id: string,
  priority: PriorityLevel,
  actor: EventActor,
): Promise<ProjectDetail> {
  const current = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, priority: true },
  })

  if (!current) {
    throw notFound('Project')
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.project.update({
      where: { id },
      data: { priority },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'priority_changed',
      entityType: 'project',
      entityId: row.id,
      description: `${actor.name} set "${row.name}" to ${priority} priority`,
      metadata: { old: current.priority, new: priority },
    })

    return toDetail(row)
  })
}

export async function addProjectMember(
  projectId: string,
  input: AddProjectMemberInput,
  actor: EventActor,
): Promise<ProjectDetail> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  if (!project) {
    throw notFound('Project')
  }

  const member = await assertMemberEligible(input.userId)

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.projectMember.create({
        data: { projectId, userId: input.userId },
      })

      await recordActivity(tx, {
        actor,
        action: 'member_added',
        entityType: 'project',
        entityId: projectId,
        description: `${actor.name} added ${member.name} to "${project.name}"`,
        metadata: { userId: input.userId },
      })
      await notify(tx, {
        userId: input.userId,
        actorId: actor.id,
        title: 'Added to project',
        message: `${actor.name} added you to "${project.name}"`,
        type: 'project',
      })

      return getProjectUnscoped(projectId, tx)
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('PROJECT_MEMBER_EXISTS', 'That person is already on this project')
    }

    throw error
  }
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
  actor: EventActor,
): Promise<ProjectDetail> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, managerId: true },
  })

  if (!project) {
    throw notFound('Project')
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true, user: { select: { name: true } } },
  })

  if (!membership) {
    throw new AppError('PROJECT_MEMBER_NOT_FOUND', 'That person is not on this project', 404)
  }

  // A task may only be assigned to the manager or a member; removing someone
  // with open work would break that for every task they hold. Completed
  // tasks are history and stay with them.
  if (project.managerId !== userId) {
    await assertNoOpenTasks(projectId, userId, membership.user.name)
  }

  return prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({ where: { id: membership.id } })

    await recordActivity(tx, {
      actor,
      action: 'member_removed',
      entityType: 'project',
      entityId: projectId,
      description: `${actor.name} removed ${membership.user.name} from "${project.name}"`,
      metadata: { userId },
    })
    await notify(tx, {
      userId,
      actorId: actor.id,
      title: 'Removed from project',
      message: `${actor.name} removed you from "${project.name}"`,
      type: 'project',
    })

    return getProjectUnscoped(projectId, tx)
  })
}

async function getProjectUnscoped(
  id: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<ProjectDetail> {
  const row = await db.project.findUnique({ where: { id }, select: detailSelect })

  if (!row) {
    throw notFound('Project')
  }

  return toDetail(row)
}

async function assertClientAssignable(clientId: string | null | undefined): Promise<void> {
  if (!clientId) {
    return
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, status: true },
  })

  if (!client) {
    throw notFound('Client')
  }

  if (client.status !== 'active') {
    throw conflict('CLIENT_NOT_ACTIVE', 'Only an active client can be assigned to a project')
  }
}

async function assertManagerEligible(managerId: string | null | undefined): Promise<void> {
  if (!managerId) {
    return
  }

  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, status: true, role: { select: { name: true } } },
  })

  if (!manager) {
    throw notFound('User')
  }

  const role = manager.role.name
  if (manager.status !== 'active' || (role !== 'admin' && role !== 'manager')) {
    throw conflict('MANAGER_NOT_ELIGIBLE', 'A project manager must be an active admin or manager')
  }
}

async function assertMemberEligible(userId: string): Promise<{ id: string; name: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, status: true },
  })

  if (!user) {
    throw notFound('User')
  }

  if (user.status !== 'active') {
    throw conflict('MEMBER_NOT_ACTIVE', 'Only an active person can be added to a project')
  }

  return { id: user.id, name: user.name }
}

async function isMember(projectId: string, userId: string): Promise<boolean> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  })

  return membership !== null
}

async function assertNoOpenTasks(projectId: string, userId: string, who: string): Promise<void> {
  const open = await prisma.task.count({
    where: { projectId, assignedTo: userId, status: { not: 'completed' } },
  })

  if (open > 0) {
    throw conflict(
      'ASSIGNEE_HAS_OPEN_TASKS',
      `Reassign the ${open} open ${open === 1 ? 'task' : 'tasks'} held by ${who} first`,
    )
  }
}

function assertDeadlineNotBeforeStart(startDate: string | null, deadline: string | null): void {
  if (startDate && deadline && deadline < startDate) {
    throw new AppError('VALIDATION_ERROR', 'The deadline must be on or after the start date', 422, {
      deadline: ['The deadline must be on or after the start date'],
    })
  }
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

/**
 * The lifecycle in `@opsflow/types/project` is the rule, not a suggestion:
 * the clients only offer reachable moves, and this is what stops a
 * hand-written request reviving a cancelled project or completing one that
 * never started. A no-op is rejected too, so the activity feed never gains
 * a row saying nothing changed.
 */
function assertProjectTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (from === to) {
    throw conflict('PROJECT_STATUS_UNCHANGED', `This project is already ${projectStatusText(to)}`)
  }

  if (!canTransitionProject(from, to)) {
    throw conflict(
      'INVALID_PROJECT_TRANSITION',
      from === 'cancelled'
        ? 'A cancelled project cannot be reopened'
        : `A ${projectStatusText(from)} project cannot move straight to ${projectStatusText(to)}`,
    )
  }
}
