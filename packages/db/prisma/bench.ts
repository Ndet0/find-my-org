import { prisma } from '../src/index'

/**
 * A realistic data volume for measuring query plans (sprint Phase 15).
 *
 * The development seed makes a handful of rows, which is too few for
 * Postgres to prefer any index over a sequential scan, so a plan read
 * against it says nothing. This inserts tens of thousands of rows with a
 * deterministic generator, spread over time and across statuses, so the
 * planner has selectivity to reason about.
 *
 * Every row is marked — bench users have `@bench.opsflow.local` emails and
 * every other row carries the `[bench]` prefix in a text column — so
 * `--clean` can remove them all and return each table to its prior count.
 *
 *   pnpm db:bench            insert (idempotent: refuses if bench rows exist)
 *   pnpm db:bench --clean    remove every bench row
 *   BENCH_SCALE=2 pnpm db:bench   double the volumes
 *
 * Runs after `pnpm db:seed`: it reads the roles, departments and the three
 * seeded accounts rather than creating them, and makes the seeded employee
 * and manager assignee / member / manager of a share of the work so their
 * scoped views have real selectivity.
 */

const MARK = '[bench]'
const BENCH_DOMAIN = 'bench.opsflow.local'
const SCALE = Number(process.env.BENCH_SCALE ?? '1')

const VOLUME = {
  users: Math.round(200 * SCALE),
  clients: Math.round(150 * SCALE),
  projects: Math.round(400 * SCALE),
  tasks: Math.round(8_000 * SCALE),
  activity: Math.round(60_000 * SCALE),
  notifications: Math.round(15_000 * SCALE),
}

const CHUNK = 1_000
const DAY = 86_400_000

/** Deterministic PRNG (mulberry32) so two runs produce the same distribution. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = rng(20260913)

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T
}

/** Picks by weight, so statuses are distributed rather than uniform. */
function weighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let r = random() * total
  for (const [value, weight] of entries) {
    r -= weight
    if (r <= 0) return value
  }
  return entries[entries.length - 1]?.[0] as T
}

function between(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

/** A date-only value between `daysFrom` and `daysTo` relative to today. */
function dateOnly(daysFrom: number, daysTo: number): Date {
  const now = new Date()
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return new Date(base + between(daysFrom, daysTo) * DAY)
}

/** A timestamp in the past two years, with a random time of day. */
function timestamp(daysAgoMax = 730): Date {
  return new Date(Date.now() - random() * daysAgoMax * DAY)
}

async function inChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await insert(rows.slice(i, i + CHUNK))
  }
}

async function clean() {
  const before = await counts()

  // FK order: tasks and members cascade from projects, but deleting them
  // first keeps each step's count meaningful in the log.
  const tasks = await prisma.task.deleteMany({ where: { title: { startsWith: MARK } } })
  const projects = await prisma.project.deleteMany({ where: { name: { startsWith: MARK } } })
  const clients = await prisma.client.deleteMany({ where: { name: { startsWith: MARK } } })
  const notifications = await prisma.notification.deleteMany({
    where: { title: { startsWith: MARK } },
  })
  const activity = await prisma.activityLog.deleteMany({
    where: { description: { startsWith: MARK } },
  })
  const users = await prisma.user.deleteMany({ where: { email: { endsWith: `@${BENCH_DOMAIN}` } } })

  console.log(
    `Removed ${tasks.count} tasks, ${projects.count} projects, ${clients.count} clients, ` +
      `${notifications.count} notifications, ${activity.count} activity rows, ${users.count} users`,
  )
  console.table({ before, after: await counts() })
}

async function counts() {
  const [users, clients, projects, members, tasks, activity, notifications] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.project.count(),
    prisma.projectMember.count(),
    prisma.task.count(),
    prisma.activityLog.count(),
    prisma.notification.count(),
  ])
  return { users, clients, projects, members, tasks, activity, notifications }
}

async function seed() {
  const existing = await prisma.user.count({ where: { email: { endsWith: `@${BENCH_DOMAIN}` } } })
  if (existing) {
    throw new Error(`Bench rows already present (${existing} users) — run with --clean first`)
  }

  const [roles, departments, seeded] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true } }),
    prisma.user.findMany({
      where: {
        email: { in: ['admin@opsflow.local', 'manager@opsflow.local', 'employee@opsflow.local'] },
      },
      select: { id: true, email: true },
    }),
  ])

  const byName = new Map(roles.map((r) => [r.name, r.id]))
  const byLocalPart = new Map(seeded.map((u) => [u.email.replace(/@.*$/, ''), u.id]))
  const missing =
    'Roles, departments or the three seeded accounts are missing — run `pnpm db:seed` first'
  const required = (map: Map<string, string>, key: string): string => {
    const value = map.get(key)
    if (!value) throw new Error(missing)
    return value
  }

  if (!departments.length) throw new Error(missing)
  const managerRoleId = required(byName, 'manager')
  const employeeRoleId = required(byName, 'employee')
  const admin = required(byLocalPart, 'admin')
  const manager = required(byLocalPart, 'manager')
  const employee = required(byLocalPart, 'employee')

  const before = await counts()

  // --- users -------------------------------------------------------------
  await inChunks(
    Array.from({ length: VOLUME.users }, (_, i) => ({
      name: `${MARK} Person ${String(i + 1).padStart(4, '0')}`,
      email: `person${i + 1}@${BENCH_DOMAIN}`,
      emailVerified: true,
      roleId: i % 10 === 0 ? managerRoleId : employeeRoleId,
      departmentId: pick(departments).id,
      position: pick(['Engineer', 'Designer', 'Analyst', 'Coordinator', 'Lead']),
      status: weighted({ active: 85, inactive: 10, suspended: 5 } as const),
      joinedAt: dateOnly(-730, 0),
    })),
    (data) => prisma.user.createMany({ data }),
  )
  const benchUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${BENCH_DOMAIN}` } },
    select: { id: true, roleId: true },
  })
  const managerPool = [
    manager,
    ...benchUsers.filter((u) => u.roleId === managerRoleId).map((u) => u.id),
  ]
  const employeePool = [
    employee,
    ...benchUsers.filter((u) => u.roleId === employeeRoleId).map((u) => u.id),
  ]
  const everyone = [admin, ...managerPool, ...employeePool]

  // --- clients -----------------------------------------------------------
  await inChunks(
    Array.from({ length: VOLUME.clients }, (_, i) => ({
      name: `${MARK} Client ${String(i + 1).padStart(4, '0')}`,
      company: `${pick(['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'])} ${i + 1} Ltd`,
      email: `contact${i + 1}@client${i + 1}.example`,
      status: weighted({ active: 80, inactive: 15, archived: 5 } as const),
      createdAt: timestamp(),
    })),
    (data) => prisma.client.createMany({ data }),
  )
  const clientIds = (
    await prisma.client.findMany({ where: { name: { startsWith: MARK } }, select: { id: true } })
  ).map((c) => c.id)

  // --- projects ----------------------------------------------------------
  // The seeded manager runs one project in eight, so the employee scope
  // (manager OR member) and the manager's own filters have a realistic share.
  await inChunks(
    Array.from({ length: VOLUME.projects }, (_, i) => ({
      name: `${MARK} Project ${String(i + 1).padStart(4, '0')}`,
      description: `Bench project ${i + 1} for ${pick(['migration', 'launch', 'audit', 'rollout'])}`,
      clientId: pick(clientIds),
      managerId: i % 8 === 0 ? manager : pick(managerPool),
      status: weighted({
        planning: 15,
        active: 40,
        on_hold: 8,
        completed: 25,
        delayed: 7,
        cancelled: 5,
      } as const),
      priority: weighted({ low: 20, medium: 45, high: 25, critical: 10 } as const),
      progress: between(0, 100),
      startDate: dateOnly(-730, 0),
      deadline: dateOnly(-365, 180),
      createdAt: timestamp(),
    })),
    (data) => prisma.project.createMany({ data }),
  )
  const projectIds = (
    await prisma.project.findMany({ where: { name: { startsWith: MARK } }, select: { id: true } })
  ).map((p) => p.id)

  // --- members: 3–8 per project; the seeded employee is on one in ten ------
  const members: { projectId: string; userId: string }[] = []
  projectIds.forEach((projectId, i) => {
    const chosen = new Set<string>()
    if (i % 10 === 0) chosen.add(employee)
    while (chosen.size < between(3, 8)) chosen.add(pick(employeePool))
    for (const userId of chosen) members.push({ projectId, userId })
  })
  await inChunks(members, (data) => prisma.projectMember.createMany({ data }))
  const membersByProject = new Map<string, string[]>()
  for (const m of members) {
    membersByProject.set(m.projectId, [...(membersByProject.get(m.projectId) ?? []), m.userId])
  }

  // --- tasks: assigned within the project's members; ~4% to the seeded employee
  await inChunks(
    Array.from({ length: VOLUME.tasks }, (_, i) => {
      const projectId = pick(projectIds)
      const pool = membersByProject.get(projectId) ?? employeePool
      const status = weighted({ pending: 30, in_progress: 25, blocked: 5, completed: 40 } as const)
      const assignedTo = random() < 0.04 ? employee : random() < 0.9 ? pick(pool) : null
      return {
        projectId,
        assignedTo,
        createdBy: pick(managerPool),
        title: `${MARK} Task ${String(i + 1).padStart(5, '0')} ${pick(['review', 'build', 'deploy', 'write', 'test'])}`,
        description:
          random() < 0.6
            ? `Bench task ${i + 1}: ${pick(['needs sign-off', 'blocked on vendor', 'quick fix', 'follow-up'])}`
            : null,
        status,
        priority: weighted({ low: 25, medium: 45, high: 22, critical: 8 } as const),
        dueDate: random() < 0.85 ? dateOnly(-400, 120) : null,
        completedAt: status === 'completed' ? timestamp(365) : null,
        createdAt: timestamp(),
      }
    }),
    (data) => prisma.task.createMany({ data }),
  )
  const taskIds = (
    await prisma.task.findMany({ where: { title: { startsWith: MARK } }, select: { id: true } })
  ).map((t) => t.id)

  // --- activity: the seeded employee wrote ~2% ----------------------------
  const actions = [
    'created',
    'updated',
    'status_changed',
    'priority_changed',
    'assigned',
    'completed',
    'member_added',
  ]
  await inChunks(
    Array.from({ length: VOLUME.activity }, (_, i) => {
      const entityType = weighted({ task: 70, project: 20, client: 6, user: 4 } as const)
      const entityId =
        entityType === 'task'
          ? pick(taskIds)
          : entityType === 'project'
            ? pick(projectIds)
            : entityType === 'client'
              ? pick(clientIds)
              : pick(everyone)
      return {
        userId: random() < 0.02 ? employee : pick(everyone),
        action: pick(actions),
        entityType,
        entityId,
        description: `${MARK} activity ${i + 1}: ${pick(['moved', 'edited', 'reassigned', 'opened'])} a ${entityType}`,
        createdAt: timestamp(),
      }
    }),
    (data) => prisma.activityLog.createMany({ data }),
  )

  // --- notifications: the seeded employee receives ~3% --------------------
  await inChunks(
    Array.from({ length: VOLUME.notifications }, (_, i) => ({
      userId: random() < 0.03 ? employee : pick(everyone),
      title: `${MARK} Notification ${i + 1}`,
      message: `Bench notification ${i + 1}: ${pick(['task assigned', 'project updated', 'you were added'])}`,
      type: weighted({ task: 60, project: 30, user: 8, system: 2 } as const),
      isRead: random() < 0.7,
      createdAt: timestamp(),
    })),
    (data) => prisma.notification.createMany({ data }),
  )

  // Fresh statistics, so the planner sees the volume before anything is measured.
  await prisma.$executeRawUnsafe('ANALYZE')

  console.table({ before, after: await counts() })
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to insert bench data in production')
  }

  if (process.argv.includes('--clean')) {
    await clean()
  } else {
    await seed()
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
