import { type Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import type { PriorityLevel } from '@opsflow/types/project'
import type {
  CreateTaskInput,
  TaskDetail,
  TaskListItem,
  TaskListQuery,
  TaskStatus,
  UpdateTaskInput,
} from '@opsflow/types/task'
import type { NamedRef } from '@opsflow/types/user'
import { conflict, notFound } from '../lib/errors.js'
import { type EventActor, recordActivity } from './activity.service.js'
import { notify } from './notification.service.js'

export type TaskActor = EventActor

/**
 * The columns every task-shaped response needs. Declared once so the list
 * and detail queries cannot drift apart, and so project and assignee arrive
 * in the same round trip rather than one query per row.
 */
const listSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect

const detailSelect = {
  ...listSelect,
  description: true,
  createdAt: true,
  completedAt: true,
  creator: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect

type ListRow = Prisma.TaskGetPayload<{ select: typeof listSelect }>
type DetailRow = Prisma.TaskGetPayload<{ select: typeof detailSelect }>

/** Dates cross the wire as date-only strings, not full timestamps. */
function toDateString(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null
}

function toNamedRef(row: { id: string; name: string } | null): NamedRef | null {
  return row
}

function toListItem(row: ListRow): TaskListItem {
  const { dueDate, project, assignee, ...task } = row
  return {
    ...task,
    dueDate: toDateString(dueDate),
    project,
    assignee: toNamedRef(assignee),
  }
}

function toDetail(row: DetailRow): TaskDetail {
  const { dueDate, createdAt, completedAt, project, assignee, creator, ...task } = row
  return {
    ...task,
    dueDate: toDateString(dueDate),
    createdAt: createdAt.toISOString(),
    completedAt: completedAt?.toISOString() ?? null,
    project,
    assignee: toNamedRef(assignee),
    creator: toNamedRef(creator),
  }
}

/**
 * An employee may only see tasks assigned to them. Admin and manager see
 * the whole table. Misses are 404 rather than 403 so the existence of a
 * hidden row is not advertised.
 */
function visibilityWhere(actor: TaskActor): Prisma.TaskWhereInput {
  if (actor.role !== 'employee') {
    return {}
  }

  return { assignedTo: actor.id }
}

function buildWhere(query: TaskListQuery, actor: TaskActor): Prisma.TaskWhereInput {
  const filters: Prisma.TaskWhereInput = {}

  if (query.q) {
    filters.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  if (query.status) {
    filters.status = query.status
  }

  if (query.priority) {
    filters.priority = query.priority
  }

  if (query.projectId) {
    filters.projectId = query.projectId
  }

  if (query.assignedTo) {
    filters.assignedTo = query.assignedTo
  }

  if (query.overdue) {
    const today = utcToday()
    filters.dueDate = { lt: today }
    filters.status = query.status ? query.status : { not: 'completed' satisfies TaskStatus }
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

export async function listTasks(
  query: TaskListQuery,
  actor: TaskActor,
): Promise<Paginated<TaskListItem>> {
  const where = buildWhere(query, actor)

  const [rows, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      select: listSelect,
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { title: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.task.count({ where }),
  ])

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getTask(id: string, actor: TaskActor): Promise<TaskDetail> {
  const row = await findVisible(id, actor)

  if (!row) {
    throw notFound('Task')
  }

  return toDetail(row)
}

export async function createTask(input: CreateTaskInput, actor: TaskActor): Promise<TaskDetail> {
  await assertProjectExists(input.projectId)
  await assertAssigneeEligible(input.projectId, input.assignedTo)

  return prisma.$transaction(async (tx) => {
    const row = await tx.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        dueDate: toDate(input.dueDate),
        project: { connect: { id: input.projectId } },
        assignee: input.assignedTo ? { connect: { id: input.assignedTo } } : undefined,
        creator: { connect: { id: actor.id } },
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'created',
      entityType: 'task',
      entityId: row.id,
      description: `${actor.name} created "${row.title}"`,
    })
    await notify(tx, {
      userId: input.assignedTo,
      actorId: actor.id,
      title: 'Task assigned',
      message: `${actor.name} assigned you "${row.title}"`,
      type: 'task',
    })

    return toDetail(row)
  })
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  actor: TaskActor,
): Promise<TaskDetail> {
  const current = await findVisible(id, actor)

  if (!current) {
    throw notFound('Task')
  }

  const projectId = input.projectId ?? current.project.id
  const assignedTo =
    input.assignedTo !== undefined ? input.assignedTo : (current.assignee?.id ?? null)

  if (input.projectId !== undefined) {
    await assertProjectExists(input.projectId)
  }

  if (input.projectId !== undefined || input.assignedTo !== undefined) {
    await assertAssigneeEligible(projectId, assignedTo)
  }

  const data: Prisma.TaskUpdateInput = {}

  if (input.title !== undefined) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.dueDate !== undefined) data.dueDate = toDate(input.dueDate)
  if (input.projectId !== undefined) {
    data.project = { connect: { id: input.projectId } }
  }
  if (input.assignedTo !== undefined) {
    data.assignee = input.assignedTo ? { connect: { id: input.assignedTo } } : { disconnect: true }
  }

  const previousAssigneeId = current.assignee?.id ?? null
  const assigned = input.assignedTo !== undefined && input.assignedTo !== previousAssigneeId

  return prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id },
      data,
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: assigned ? 'assigned' : 'updated',
      entityType: 'task',
      entityId: row.id,
      description: assigned
        ? `${actor.name} assigned "${row.title}"`
        : `${actor.name} updated "${row.title}"`,
    })
    if (assigned) {
      await notify(tx, {
        userId: input.assignedTo,
        actorId: actor.id,
        title: 'Task assigned',
        message: `${actor.name} assigned you "${row.title}"`,
        type: 'task',
      })
    }

    return toDetail(row)
  })
}

export async function setTaskStatus(
  id: string,
  status: TaskStatus,
  actor: TaskActor,
): Promise<TaskDetail> {
  const current = await findVisible(id, actor)

  if (!current) {
    throw notFound('Task')
  }

  const project = await prisma.project.findUnique({
    where: { id: current.project.id },
    select: { managerId: true },
  })

  const completed = status === 'completed'

  return prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id },
      data: {
        status,
        completedAt: completed ? new Date() : null,
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: completed ? 'completed' : 'status_changed',
      entityType: 'task',
      entityId: row.id,
      description: completed
        ? `${actor.name} completed "${row.title}"`
        : `${actor.name} changed "${row.title}" to ${labelStatus(status)}`,
      metadata: { old: current.status, new: status },
    })
    if (completed) {
      await notify(tx, {
        userId: project?.managerId,
        actorId: actor.id,
        title: 'Task completed',
        message: `${actor.name} completed "${row.title}"`,
        type: 'task',
      })
    }

    return toDetail(row)
  })
}

export async function setTaskPriority(
  id: string,
  priority: PriorityLevel,
  actor: TaskActor,
): Promise<TaskDetail> {
  const current = await findVisible(id, actor)

  if (!current) {
    throw notFound('Task')
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id },
      data: { priority },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'priority_changed',
      entityType: 'task',
      entityId: row.id,
      description: `${actor.name} set "${row.title}" to ${priority} priority`,
      metadata: { old: current.priority, new: priority },
    })

    return toDetail(row)
  })
}

export async function deleteTask(id: string, actor: TaskActor): Promise<TaskDetail> {
  const current = await findVisible(id, actor)

  if (!current) {
    throw notFound('Task')
  }

  await prisma.$transaction(async (tx) => {
    await recordActivity(tx, {
      actor,
      action: 'deleted',
      entityType: 'task',
      entityId: current.id,
      description: `${actor.name} deleted "${current.title}"`,
    })
    await tx.task.delete({ where: { id } })
  })

  return toDetail(current)
}

async function findVisible(id: string, actor: TaskActor): Promise<DetailRow | null> {
  return prisma.task.findFirst({
    where: { id, ...visibilityWhere(actor) },
    select: detailSelect,
  })
}

async function assertProjectExists(id: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true } })

  if (!project) {
    throw notFound('Project')
  }
}

async function assertAssigneeEligible(
  projectId: string,
  assignedTo: string | null | undefined,
): Promise<void> {
  if (!assignedTo) {
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: assignedTo },
    select: { id: true, status: true },
  })

  if (!user) {
    throw notFound('User')
  }

  if (user.status !== 'active') {
    throw conflict('ASSIGNEE_NOT_ACTIVE', 'Only an active person can be assigned a task')
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      managerId: true,
      members: { where: { userId: assignedTo }, select: { id: true } },
    },
  })

  if (!project) {
    throw notFound('Project')
  }

  const onProject = project.managerId === assignedTo || project.members.length > 0

  if (!onProject) {
    throw conflict(
      'ASSIGNEE_NOT_ON_PROJECT',
      'A task can only be assigned to the project manager or a team member',
    )
  }
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

function labelStatus(status: TaskStatus): string {
  return status.replaceAll('_', ' ')
}
