import { type Prisma, prisma } from '@opsflow/db'
import type {
  CreateDepartmentInput,
  DepartmentListItem,
  UpdateDepartmentInput,
} from '@opsflow/types/department'
import { conflict, notFound } from '../lib/errors.js'
import { type EventActor, recordActivity } from './activity.service.js'

const departmentSelect = {
  id: true,
  name: true,
  description: true,
  _count: { select: { users: true } },
} satisfies Prisma.DepartmentSelect

type DepartmentRow = Prisma.DepartmentGetPayload<{ select: typeof departmentSelect }>

function toListItem(row: DepartmentRow): DepartmentListItem {
  const { _count, ...department } = row
  return { ...department, memberCount: _count.users }
}

/**
 * All departments, unpaginated. They are reference data — a handful of rows
 * that populate filter controls and labels — so paging them would add a
 * contract the callers would only have to unwind.
 */
export async function listDepartments(): Promise<DepartmentListItem[]> {
  const rows = await prisma.department.findMany({
    select: departmentSelect,
    orderBy: { name: 'asc' },
  })

  return rows.map(toListItem)
}

export async function createDepartment(
  input: CreateDepartmentInput,
  actor: EventActor,
): Promise<DepartmentListItem> {
  await assertNameAvailable(input.name)

  return prisma.$transaction(async (tx) => {
    const row = await tx.department.create({
      data: { name: input.name, description: input.description ?? null },
      select: departmentSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'created',
      entityType: 'department',
      entityId: row.id,
      description: `${actor.name} created ${row.name}`,
    })

    return toListItem(row)
  })
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
  actor: EventActor,
): Promise<DepartmentListItem> {
  const current = await prisma.department.findUnique({ where: { id }, select: { id: true } })

  if (!current) {
    throw notFound('Department')
  }

  if (input.name !== undefined) {
    await assertNameAvailable(input.name, id)
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.department.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      select: departmentSelect,
    })

    await recordActivity(tx, {
      actor,
      action: 'updated',
      entityType: 'department',
      entityId: row.id,
      description: `${actor.name} updated ${row.name}`,
    })

    return toListItem(row)
  })
}

export async function deleteDepartment(id: string, actor: EventActor): Promise<DepartmentListItem> {
  const row = await prisma.department.findUnique({
    where: { id },
    select: departmentSelect,
  })

  if (!row) {
    throw notFound('Department')
  }

  if (row._count.users > 0) {
    throw conflict(
      'DEPARTMENT_HAS_MEMBERS',
      "Reassign this department's members before deleting it",
    )
  }

  await prisma.$transaction(async (tx) => {
    await recordActivity(tx, {
      actor,
      action: 'deleted',
      entityType: 'department',
      entityId: row.id,
      description: `${actor.name} deleted ${row.name}`,
    })
    await tx.department.delete({ where: { id } })
  })

  return toListItem(row)
}

async function assertNameAvailable(name: string, exceptId?: string): Promise<void> {
  const existing = await prisma.department.findUnique({
    where: { name },
    select: { id: true },
  })

  if (existing && existing.id !== exceptId) {
    throw conflict('DEPARTMENT_NAME_TAKEN', 'A department with that name already exists')
  }
}
