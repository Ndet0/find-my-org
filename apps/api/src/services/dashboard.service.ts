import { prisma } from '@opsflow/db'
import type {
  DashboardOrgStats,
  DashboardProjectStats,
  DashboardStats,
  DashboardTaskStats,
} from '@opsflow/types/dashboard'
import { can } from '@opsflow/types/permissions'
import type { ProjectStatus } from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import { utcToday } from '../lib/dates.js'
import type { EventActor } from './activity.service.js'
import { projectVisibilityWhere } from './project.service.js'
import { taskVisibilityWhere } from './task.service.js'

export type DashboardActor = EventActor

/**
 * The counts behind the dashboard, computed server-side (technical
 * architecture §24) in a single transaction so every card reflects the same
 * snapshot. Project and task counts reuse the exact visibility rules of the
 * list endpoints, so an employee's numbers are "my" numbers. Org-wide
 * metrics are keyed off `users:read` — admin and manager hold it, an
 * employee does not, so an employee's payload carries `org: null` and the
 * directory sizes never leave the server.
 */
export async function getDashboardStats(actor: DashboardActor): Promise<DashboardStats> {
  const today = utcToday()
  const projectScope = projectVisibilityWhere(actor)
  const taskScope = taskVisibilityWhere(actor)

  // `as const` keeps this a tuple, so the transaction result below is a
  // tuple too and every index is a `number` rather than `number | undefined`.
  const scoped = [
    prisma.project.count({ where: projectScope }),
    prisma.project.count({ where: { AND: [projectScope, { status: 'active' }] } }),
    prisma.project.count({ where: { AND: [projectScope, { status: 'completed' }] } }),
    prisma.project.count({ where: { AND: [projectScope, { status: 'delayed' }] } }),
    prisma.project.count({
      where: {
        AND: [
          projectScope,
          {
            deadline: { lt: today },
            status: { notIn: ['completed', 'cancelled'] satisfies ProjectStatus[] },
          },
        ],
      },
    }),
    prisma.task.count({ where: taskScope }),
    prisma.task.count({ where: { AND: [taskScope, { status: 'pending' }] } }),
    prisma.task.count({ where: { AND: [taskScope, { status: 'in_progress' }] } }),
    prisma.task.count({ where: { AND: [taskScope, { status: 'blocked' }] } }),
    prisma.task.count({ where: { AND: [taskScope, { status: 'completed' }] } }),
    prisma.task.count({
      where: {
        AND: [
          taskScope,
          { dueDate: { lt: today }, status: { not: 'completed' satisfies TaskStatus } },
        ],
      },
    }),
  ] as const

  if (!can(actor.role, 'users:read')) {
    const counts = await prisma.$transaction([...scoped])

    return { projects: projectStats(counts), tasks: taskStats(counts), org: null }
  }

  const counts = await prisma.$transaction([
    ...scoped,
    prisma.user.count(),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.user.count({ where: { role: { name: 'employee' } } }),
    prisma.department.count(),
    prisma.client.count(),
    prisma.client.count({ where: { status: 'active' } }),
  ])

  const org: DashboardOrgStats = {
    users: { total: counts[11], active: counts[12] },
    employees: { total: counts[13] },
    departments: { total: counts[14] },
    clients: { total: counts[15], active: counts[16] },
  }

  return { projects: projectStats(counts), tasks: taskStats(counts), org }
}

/** The first eleven counts of either transaction, in declaration order. */
type ScopedCounts = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  ...number[],
]

function projectStats(counts: ScopedCounts): DashboardProjectStats {
  return {
    total: counts[0],
    active: counts[1],
    completed: counts[2],
    delayed: counts[3],
    overdue: counts[4],
  }
}

function taskStats(counts: ScopedCounts): DashboardTaskStats {
  return {
    total: counts[5],
    pending: counts[6],
    inProgress: counts[7],
    blocked: counts[8],
    completed: counts[9],
    overdue: counts[10],
  }
}
