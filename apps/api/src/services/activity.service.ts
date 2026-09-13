import { type Prisma, prisma } from '@opsflow/db'
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityListItem,
  ActivityListQuery,
} from '@opsflow/types/activity'
import type { Paginated } from '@opsflow/types/api'
import type { NamedRef } from '@opsflow/types/user'
import type { EventActor } from '../lib/actor.js'

export type { EventActor }

/** Interactive-transaction client, so a mutation and its log share a commit. */
export type DbClient = Prisma.TransactionClient

const listSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  description: true,
  metadata: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.ActivityLogSelect

type ListRow = Prisma.ActivityLogGetPayload<{ select: typeof listSelect }>

function toNamedRef(row: { id: string; name: string } | null): NamedRef | null {
  return row
}

function toListItem(row: ListRow): ActivityListItem {
  const { user, createdAt, action, entityType, ...log } = row
  return {
    ...log,
    action: action as ActivityAction,
    entityType: entityType as ActivityEntityType,
    createdAt: createdAt.toISOString(),
    actor: toNamedRef(user),
  }
}

/**
 * An employee sees only the actions they performed. Admin and manager see
 * the whole trail. Misses are not a concern here: this is a list, not a
 * get-by-id, and there is nothing to 404.
 */
function visibilityWhere(actor: EventActor): Prisma.ActivityLogWhereInput {
  if (actor.role !== 'employee') {
    return {}
  }

  return { userId: actor.id }
}

function buildWhere(query: ActivityListQuery, actor: EventActor): Prisma.ActivityLogWhereInput {
  const filters: Prisma.ActivityLogWhereInput = {}

  if (query.q) {
    filters.description = { contains: query.q, mode: 'insensitive' }
  }

  if (query.entityType) {
    filters.entityType = query.entityType
  }

  if (query.entityId) {
    filters.entityId = query.entityId
  }

  const visibility = visibilityWhere(actor)

  if (!Object.keys(visibility).length) {
    return filters
  }

  return { AND: [visibility, filters] }
}

export async function listActivity(
  query: ActivityListQuery,
  actor: EventActor,
): Promise<Paginated<ActivityListItem>> {
  const where = buildWhere(query, actor)

  const [rows, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      select: listSelect,
      // Rows written in one transaction share `createdAt`, so `id` breaks the
      // tie. It is uuid(7), so id-desc continues createdAt-desc.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.activityLog.count({ where }),
  ])

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export type RecordActivityInput = {
  actor: EventActor
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string | null
  description: string
  metadata?: Record<string, unknown>
}

/** Writes one audit row. Callers pass the transaction so the log cannot commit without the mutation. */
export async function recordActivity(db: DbClient, input: RecordActivityInput): Promise<void> {
  await db.activityLog.create({
    data: {
      userId: input.actor.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  })
}
