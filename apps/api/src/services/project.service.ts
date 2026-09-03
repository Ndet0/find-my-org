import { Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import type { RoleName } from '@opsflow/types/permissions'
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  PriorityLevel,
  ProjectDetail,
  ProjectListItem,
  ProjectListQuery,
  ProjectStatus,
  UpdateProjectInput,
} from '@opsflow/types/project'
import type { NamedRef } from '@opsflow/types/user'
import { AppError, conflict, notFound } from '../lib/errors.js'

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
function visibilityWhere(actor: ProjectActor): Prisma.ProjectWhereInput {
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

  const visibility = visibilityWhere(actor)

  if (!Object.keys(visibility).length) {
    return filters
  }

  return { AND: [visibility, filters] }
}

function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
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
    where: { id, ...visibilityWhere(actor) },
    select: detailSelect,
  })

  if (!row) {
    throw notFound('Project')
  }

  return toDetail(row)
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  await assertClientAssignable(input.clientId)
  await assertManagerEligible(input.managerId)

  const row = await prisma.project.create({
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

  return toDetail(row)
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
  const current = await prisma.project.findUnique({
    where: { id },
    select: { id: true, startDate: true, deadline: true },
  })

  if (!current) {
    throw notFound('Project')
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

  const row = await prisma.project.update({
    where: { id },
    data,
    select: detailSelect,
  })

  return toDetail(row)
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ProjectDetail> {
  await assertProjectExists(id)

  const row = await prisma.project.update({
    where: { id },
    data: { status },
    select: detailSelect,
  })

  return toDetail(row)
}

export async function setProjectPriority(
  id: string,
  priority: PriorityLevel,
): Promise<ProjectDetail> {
  await assertProjectExists(id)

  const row = await prisma.project.update({
    where: { id },
    data: { priority },
    select: detailSelect,
  })

  return toDetail(row)
}

export async function addProjectMember(
  projectId: string,
  input: AddProjectMemberInput,
): Promise<ProjectDetail> {
  await assertProjectExists(projectId)
  await assertMemberEligible(input.userId)

  try {
    await prisma.projectMember.create({
      data: { projectId, userId: input.userId },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('PROJECT_MEMBER_EXISTS', 'That person is already on this project')
    }

    throw error
  }

  return getProjectUnscoped(projectId)
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectDetail> {
  await assertProjectExists(projectId)

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  })

  if (!membership) {
    throw new AppError('PROJECT_MEMBER_NOT_FOUND', 'That person is not on this project', 404)
  }

  await prisma.projectMember.delete({ where: { id: membership.id } })

  return getProjectUnscoped(projectId)
}

async function getProjectUnscoped(id: string): Promise<ProjectDetail> {
  const row = await prisma.project.findUnique({ where: { id }, select: detailSelect })

  if (!row) {
    throw notFound('Project')
  }

  return toDetail(row)
}

async function assertProjectExists(id: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true } })

  if (!project) {
    throw notFound('Project')
  }
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

async function assertMemberEligible(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  })

  if (!user) {
    throw notFound('User')
  }

  if (user.status !== 'active') {
    throw conflict('MEMBER_NOT_ACTIVE', 'Only an active person can be added to a project')
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
