import { type Prisma, prisma } from '@opsflow/db'
import type { Paginated } from '@opsflow/types/api'
import type {
  ClientDetail,
  ClientListItem,
  ClientListQuery,
  ClientStatus,
  CreateClientInput,
  UpdateClientInput,
} from '@opsflow/types/client'
import { notFound } from '../lib/errors.js'
import { type EventActor, recordActivity } from './activity.service.js'

/**
 * The columns every client-shaped response needs. Declared once so the list
 * and detail queries cannot drift apart, and so the project count arrives
 * in the same round trip rather than one query per row.
 */
const listSelect = {
  id: true,
  name: true,
  company: true,
  email: true,
  phone: true,
  status: true,
  _count: { select: { projects: true } },
} satisfies Prisma.ClientSelect

const detailSelect = {
  ...listSelect,
  address: true,
  notes: true,
  createdAt: true,
} satisfies Prisma.ClientSelect

type ListRow = Prisma.ClientGetPayload<{ select: typeof listSelect }>
type DetailRow = Prisma.ClientGetPayload<{ select: typeof detailSelect }>

function toListItem(row: ListRow): ClientListItem {
  const { _count, ...client } = row
  return { ...client, projectCount: _count.projects }
}

function toDetail(row: DetailRow): ClientDetail {
  const { _count, createdAt, ...client } = row
  return { ...client, projectCount: _count.projects, createdAt: createdAt.toISOString() }
}

function buildWhere(query: ClientListQuery): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {}

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { company: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  if (query.status) {
    where.status = query.status
  }

  return where
}

export async function listClients(query: ClientListQuery): Promise<Paginated<ClientListItem>> {
  const where = buildWhere(query)

  // One transaction so the page and the total describe the same snapshot;
  // separately they can disagree when rows are written between the queries.
  const [rows, total] = await prisma.$transaction([
    prisma.client.findMany({
      where,
      select: listSelect,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getClient(id: string): Promise<ClientDetail> {
  const row = await prisma.client.findUnique({ where: { id }, select: detailSelect })

  if (!row) {
    throw notFound('Client')
  }

  return toDetail(row)
}

export async function createClient(
  input: CreateClientInput,
  actor: EventActor,
): Promise<ClientDetail> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.client.create({
      data: {
        name: input.name,
        company: input.company ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'created',
      entityType: 'client',
      entityId: row.id,
      description: `${actor.name} created ${row.name}`,
    })

    return toDetail(row)
  })
}

export async function updateClient(
  id: string,
  input: UpdateClientInput,
  actor: EventActor,
): Promise<ClientDetail> {
  const current = await prisma.client.findUnique({ where: { id }, select: { id: true } })

  if (!current) {
    throw notFound('Client')
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.client.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.company !== undefined ? { company: input.company } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'updated',
      entityType: 'client',
      entityId: row.id,
      description: `${actor.name} updated ${row.name}`,
    })

    return toDetail(row)
  })
}

export async function setClientStatus(
  id: string,
  status: ClientStatus,
  actor: EventActor,
): Promise<ClientDetail> {
  const current = await prisma.client.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  })

  if (!current) {
    throw notFound('Client')
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.client.update({
      where: { id },
      data: { status },
      select: detailSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'status_changed',
      entityType: 'client',
      entityId: row.id,
      description: `${actor.name} changed ${row.name} to ${status}`,
      metadata: { old: current.status, new: status },
    })

    return toDetail(row)
  })
}
