/**
 * Runs the list endpoints and the dashboard through the assembled Hono app
 * in-process, captures every SQL statement Prisma emits for each, and runs
 * each statement under `EXPLAIN (ANALYZE, BUFFERS)`. The SQL is whatever the
 * services actually build — nothing here is copied by hand — so the plans
 * are the production queries' plans.
 *
 * Meant to be run on the bench volume (`pnpm db:bench`), where the planner
 * has enough rows to choose between an index and a sequential scan:
 *
 *   pnpm db:bench
 *   pnpm db:explain              writes docs/perf/<date>-query-plans.md
 *   pnpm db:explain --out FILE   somewhere else
 *
 * Signs in as the seeded admin and employee. The manager sees the same rows
 * as the admin on every list, so it is not run separately.
 */

// The query log is chosen when the client is constructed, so this has to be
// set before `@opsflow/db` is imported — hence the dynamic imports below.
process.env.PRISMA_LOG_QUERIES = '1'
process.env.NODE_ENV ??= 'test'

const { prisma } = await import('@opsflow/db')
const { app } = await import('../src/app')

type Role = 'admin' | 'employee'

type Case = {
  name: string
  path: string
  roles: Role[]
}

type Captured = { sql: string; params: unknown[] }

type Result = {
  role: Role
  name: string
  path: string
  statements: { sql: string; plan: string[]; summary: Summary }[]
}

type Summary = {
  topNode: string
  rows: number
  executionMs: number
  sharedHit: number
  sharedRead: number
}

const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'opsflow-dev-password'
const WEB_ORIGIN = process.env.WEB_URL ?? 'http://localhost:5173'
const DATE = new Date().toISOString().slice(0, 10)

const outFlag = process.argv.indexOf('--out')
const OUT =
  outFlag >= 0 && process.argv[outFlag + 1]
    ? (process.argv[outFlag + 1] as string)
    : new URL(`../../../docs/perf/${DATE}-query-plans.md`, import.meta.url).pathname

/** Ids the parameterised cases need, taken from the bench rows themselves. */
async function fixtures() {
  const [project, task, client, employee] = await Promise.all([
    prisma.project.findFirst({
      where: { name: { startsWith: '[bench]' } },
      select: { id: true },
    }),
    prisma.activityLog.groupBy({
      by: ['entityId'],
      where: { entityType: 'task', description: { startsWith: '[bench]' } },
      _count: { _all: true },
      orderBy: { _count: { entityId: 'desc' } },
      take: 1,
    }),
    prisma.client.findFirst({ where: { name: { startsWith: '[bench]' } }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: 'employee@opsflow.local' }, select: { id: true } }),
  ])

  if (!project || !task[0]?.entityId || !client || !employee) {
    throw new Error('Bench rows are missing — run `pnpm db:bench` first')
  }

  return {
    projectId: project.id,
    taskId: task[0].entityId,
    clientId: client.id,
    employeeId: employee.id,
  }
}

function cases(f: Awaited<ReturnType<typeof fixtures>>): Case[] {
  const both: Role[] = ['admin', 'employee']
  const admin: Role[] = ['admin']
  return [
    { name: 'tasks: default', path: '/api/tasks', roles: both },
    { name: 'tasks: deep page', path: '/api/tasks?page=300', roles: admin },
    { name: 'tasks: status=in_progress', path: '/api/tasks?status=in_progress', roles: both },
    { name: 'tasks: open', path: '/api/tasks?open=true', roles: both },
    { name: 'tasks: overdue', path: '/api/tasks?overdue=true', roles: both },
    { name: 'tasks: by project', path: `/api/tasks?projectId=${f.projectId}`, roles: admin },
    { name: 'tasks: assignedTo', path: `/api/tasks?assignedTo=${f.employeeId}`, roles: admin },
    { name: 'tasks: q=deploy', path: '/api/tasks?q=deploy', roles: both },
    { name: 'projects: default', path: '/api/projects', roles: both },
    { name: 'projects: overdue', path: '/api/projects?overdue=true', roles: both },
    { name: 'projects: by client', path: `/api/projects?clientId=${f.clientId}`, roles: admin },
    { name: 'projects: q=launch', path: '/api/projects?q=launch', roles: both },
    { name: 'clients: default', path: '/api/clients', roles: admin },
    { name: 'clients: q=acme', path: '/api/clients?q=acme', roles: admin },
    { name: 'users: default', path: '/api/users', roles: admin },
    { name: 'users: q=person', path: '/api/users?q=person', roles: admin },
    { name: 'users: role=employee', path: '/api/users?role=employee', roles: admin },
    { name: 'activity: default', path: '/api/activity', roles: both },
    { name: 'activity: deep page', path: '/api/activity?page=1000', roles: admin },
    {
      name: 'activity: one task',
      path: `/api/activity?entityType=task&entityId=${f.taskId}`,
      roles: admin,
    },
    { name: 'activity: q=moved', path: '/api/activity?q=moved', roles: both },
    { name: 'notifications: default', path: '/api/notifications', roles: both },
    { name: 'notifications: unread', path: '/api/notifications?unread=true', roles: both },
    { name: 'notifications: deep page', path: '/api/notifications?page=20', roles: admin },
    { name: 'notifications: unread count', path: '/api/notifications/unread-count', roles: both },
    { name: 'dashboard', path: '/api/dashboard', roles: both },
  ]
}

async function signIn(email: string) {
  const response = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB_ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  if (response.status !== 200) {
    throw new Error(`Sign-in failed for ${email}: ${response.status}`)
  }
  return response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ')
}

/** Statements that carry no plan of their own. */
const CONTROL = /^(BEGIN|COMMIT|ROLLBACK|DEALLOCATE|SET|EXPLAIN|SELECT 1)\b/i

/**
 * `requireAuth` runs on every request: the session by its unique token, then
 * the user by primary key. Both are single-row lookups on unique indexes and
 * identical for every case, so they are left out of the report.
 */
function isAuthLookup(sql: string): boolean {
  return (
    /FROM "public"\."sessions" WHERE "public"\."sessions"\."token" = /.test(sql) ||
    /FROM "public"\."users" WHERE "public"\."users"\."id" = \$\d+ LIMIT/.test(sql)
  )
}

let captured: Captured[] = []
// `$on` is typed from the `log` option the client was built with; the option
// is chosen at runtime, so the event registration is untyped here.
;(
  prisma as unknown as {
    $on: (e: 'query', cb: (ev: { query: string; params: string }) => void) => void
  }
).$on('query', (event) => {
  if (CONTROL.test(event.query.trim()) || isAuthLookup(event.query)) return
  captured.push({ sql: event.query, params: JSON.parse(event.params) as unknown[] })
})

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return `'${String(value).replace(/'/g, "''")}'`
}

/** Substitutes the parameters, highest index first so `$1` never clobbers `$10`. */
function inline({ sql, params }: Captured): string {
  let text = sql
  for (let i = params.length; i >= 1; i--) {
    text = text.replaceAll(`$${i}`, literal(params[i - 1]))
  }
  return text
}

async function explain(sql: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
    `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
  )
  return rows.map((row) => row['QUERY PLAN'])
}

function summarise(plan: string[]): Summary {
  const top = plan[0] ?? ''
  const topNode = top.replace(/\s+\(cost=.*$/, '').trim()
  const rows = Number(/actual time=[\d.]+\.\.[\d.]+ rows=(\d+)/.exec(top)?.[1] ?? 0)
  const executionMs = Number(/Execution Time: ([\d.]+) ms/.exec(plan.join('\n'))?.[1] ?? 0)
  // The first Buffers line is the root node's total.
  const buffers = plan.find((line) => line.trim().startsWith('Buffers:')) ?? ''
  const sharedHit = Number(/hit=(\d+)/.exec(buffers)?.[1] ?? 0)
  const sharedRead = Number(/read=(\d+)/.exec(buffers)?.[1] ?? 0)
  return { topNode, rows, executionMs, sharedHit, sharedRead }
}

/** The table the statement reads, for a compact label. */
function kind(sql: string): string {
  const table = /FROM "public"\."(\w+)"/.exec(sql)?.[1] ?? '?'
  return /SELECT COUNT\(\*\)/i.test(sql) ? `count ${table}` : `select ${table}`
}

async function run() {
  const f = await fixtures()
  const cookies: Record<Role, string> = {
    admin: await signIn('admin@opsflow.local'),
    employee: await signIn('employee@opsflow.local'),
  }

  const results: Result[] = []

  for (const c of cases(f)) {
    for (const role of c.roles) {
      captured = []
      const response = await app.request(c.path, { headers: { cookie: cookies[role] } })
      if (response.status !== 200) {
        throw new Error(`${c.name} as ${role}: ${response.status}`)
      }
      // Prisma dispatches the batch transaction's statements asynchronously;
      // wait a tick so the log has flushed before reading it.
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Snapshot: the EXPLAIN calls below are logged too.
      const statements = []
      for (const statement of [...captured]) {
        const sql = inline(statement)
        const plan = await explain(sql)
        statements.push({ sql, plan, summary: summarise(plan) })
      }
      results.push({ role, name: c.name, path: c.path, statements })
    }
  }

  await write(results)
}

async function write(results: Result[]) {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.activityLog.count(),
    prisma.notification.count(),
  ])

  const lines: string[] = []
  lines.push(`# Query plans — ${DATE}`)
  lines.push('')
  lines.push(
    'Generated by `pnpm db:explain` (`apps/api/scripts/explain.ts`): every SQL',
    'statement the API emitted for each request, run under',
    '`EXPLAIN (ANALYZE, BUFFERS)` on the same database. Regenerate after any',
    'index or query change rather than editing.',
  )
  lines.push('')
  lines.push(
    `Volume: ${counts[0]} users, ${counts[1]} clients, ${counts[2]} projects, ` +
      `${counts[3]} tasks, ${counts[4]} activity rows, ${counts[5]} notifications.`,
  )
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push('| Request | Role | Statement | Top node | Rows | Exec ms | Buffers hit/read |')
  lines.push('|---|---|---|---|---:|---:|---:|')
  for (const r of results) {
    for (const s of r.statements) {
      const { topNode, rows, executionMs, sharedHit, sharedRead } = s.summary
      lines.push(
        `| ${r.name} | ${r.role} | ${kind(s.sql)} | ${topNode} | ${rows} | ${executionMs.toFixed(2)} | ${sharedHit}/${sharedRead} |`,
      )
    }
  }
  lines.push('')
  lines.push('## Plans')
  for (const r of results) {
    lines.push('', `### ${r.name} — ${r.role}`, '', `\`GET ${r.path}\``)
    for (const s of r.statements) {
      lines.push('', '```sql', s.sql, '```', '', '```text', ...s.plan, '```')
    }
  }

  await Bun.write(OUT, `${lines.join('\n')}\n`)
  console.log(`Wrote ${results.reduce((n, r) => n + r.statements.length, 0)} plans to ${OUT}`)
  console.table(
    results.flatMap((r) =>
      r.statements.map((s) => ({
        request: `${r.name} (${r.role})`,
        statement: kind(s.sql),
        top: s.summary.topNode.slice(0, 48),
        ms: s.summary.executionMs,
      })),
    ),
  )
}

run()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
