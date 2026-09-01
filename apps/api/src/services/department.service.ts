import { prisma } from '@opsflow/db'
import type { DepartmentListItem } from '@opsflow/types/department'

/**
 * All departments, unpaginated. They are reference data — a handful of rows
 * that populate filter controls and labels — so paging them would add a
 * contract the callers would only have to unwind.
 */
export async function listDepartments(): Promise<DepartmentListItem[]> {
  const rows = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      // Counted by the database rather than by loading the members.
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  })

  return rows.map(({ _count, ...department }) => ({
    ...department,
    memberCount: _count.users,
  }))
}
