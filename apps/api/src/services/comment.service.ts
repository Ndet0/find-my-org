import { type Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import {
  type CommentListItem,
  type CommentListQuery,
  type CommentTarget,
  type CreateCommentInput,
  canDeleteComment,
} from '@opsflow/types/comment'
import { forbidden, notFound } from '../lib/errors.js'
import { type EventActor, recordActivity } from './activity.service.js'
import { notify } from './notification.service.js'
import { projectVisibilityWhere } from './project.service.js'
import { taskVisibilityWhere } from './task.service.js'

/**
 * A thread is discussable for as long as its parent exists: completed tasks
 * and closed projects still take comments, because history is worth
 * talking about. Only visibility is enforced, and it is the parent's.
 */
const listSelect = {
  id: true,
  body: true,
  createdAt: true,
  taskId: true,
  projectId: true,
  author: { select: { id: true, name: true } },
} satisfies Prisma.CommentSelect

type ListRow = Prisma.CommentGetPayload<{ select: typeof listSelect }>

function toListItem(row: ListRow): CommentListItem {
  const { taskId, projectId, createdAt, ...comment } = row
  return {
    ...comment,
    createdAt: createdAt.toISOString(),
    target: taskId ? { kind: 'task', id: taskId } : { kind: 'project', id: projectId ?? '' },
  }
}

/** The bit of the body that fits in a notification. */
function preview(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > 120 ? `${flat.slice(0, 119)}…` : flat
}

/** The one parent column a comment sets; the other stays null. */
function parentColumns(target: CommentTarget): { taskId: string } | { projectId: string } {
  return target.kind === 'task' ? { taskId: target.id } : { projectId: target.id }
}

type VisibleTarget = { title: string; recipients: string[] }

/**
 * The parent, if the actor may see it. A miss is 404 for the same reason
 * the task and project services give one: a hidden row is not advertised.
 * Recipients are the people with a stake in the thread; `notify` drops the
 * actor and duplicates are removed here.
 */
async function findVisibleTarget(target: CommentTarget, actor: EventActor): Promise<VisibleTarget> {
  if (target.kind === 'task') {
    const task = await prisma.task.findFirst({
      where: { id: target.id, ...taskVisibilityWhere(actor) },
      select: { title: true, assignedTo: true, createdBy: true },
    })
    if (!task) {
      throw notFound('Task')
    }
    const recipients = new Set([task.assignedTo, task.createdBy].filter((id) => id !== null))
    return { title: task.title, recipients: [...recipients] }
  }

  const project = await prisma.project.findFirst({
    where: { id: target.id, ...projectVisibilityWhere(actor) },
    select: { name: true, managerId: true },
  })
  if (!project) {
    throw notFound('Project')
  }
  return { title: project.name, recipients: project.managerId ? [project.managerId] : [] }
}

/** A comment is visible when its parent is. Admin and manager see all. */
export function commentVisibilityWhere(actor: EventActor): Prisma.CommentWhereInput {
  if (actor.role !== 'employee') {
    return {}
  }
  return {
    OR: [
      { task: { is: taskVisibilityWhere(actor) } },
      { project: { is: projectVisibilityWhere(actor) } },
    ],
  }
}

export async function listComments(
  target: CommentTarget,
  query: CommentListQuery,
  actor: EventActor,
): Promise<Paginated<CommentListItem>> {
  await findVisibleTarget(target, actor)
  const where: Prisma.CommentWhereInput = parentColumns(target)

  // Oldest first: a thread reads top-down, and appending at the end keeps
  // earlier offset pages stable while people post.
  const [rows, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      select: listSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.comment.count({ where }),
  ])

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function createComment(
  target: CommentTarget,
  input: CreateCommentInput,
  actor: EventActor,
): Promise<CommentListItem> {
  const parent = await findVisibleTarget(target, actor)

  return prisma.$transaction(async (tx) => {
    const row = await tx.comment.create({
      data: { ...parentColumns(target), userId: actor.id, body: input.body },
      select: listSelect,
    })

    // Logged against the parent so its activity feed tells the whole story.
    await recordActivity(tx, {
      actor,
      action: 'commented',
      entityType: target.kind,
      entityId: target.id,
      description: `${actor.name} commented on "${parent.title}"`,
      metadata: { commentId: row.id },
    })

    for (const userId of parent.recipients) {
      await notify(tx, {
        userId,
        actorId: actor.id,
        title: 'New comment',
        message: `${actor.name} commented on "${parent.title}": ${preview(input.body)}`,
        type: target.kind,
      })
    }

    return toListItem(row)
  })
}

export async function deleteComment(id: string, actor: EventActor): Promise<CommentListItem> {
  const current = await prisma.comment.findFirst({
    where: { id, ...commentVisibilityWhere(actor) },
    select: listSelect,
  })
  if (!current) {
    throw notFound('Comment')
  }
  if (!canDeleteComment(actor, { authorId: current.author?.id ?? null })) {
    throw forbidden()
  }

  const item = toListItem(current)
  await prisma.$transaction(async (tx) => {
    await recordActivity(tx, {
      actor,
      action: 'comment_deleted',
      entityType: item.target.kind,
      entityId: item.target.id,
      description: `${actor.name} deleted a comment`,
      metadata: { commentId: id },
    })
    await tx.comment.delete({ where: { id } })
  })

  return item
}
