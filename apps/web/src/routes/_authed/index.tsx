import type { ActivityListItem } from '@opsflow/types/activity'
import type { DashboardStats } from '@opsflow/types/dashboard'
import { can, type RoleName } from '@opsflow/types/permissions'
import type { ProjectListItem } from '@opsflow/types/project'
import type { TaskListItem } from '@opsflow/types/task'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, type LinkOptions, linkOptions } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProgressBar } from '@/components/progress-bar'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { activityQueryOptions } from '@/lib/activity'
import { ApiRequestError } from '@/lib/api'
import { dashboardStatsQueryOptions } from '@/lib/dashboard'
import { notificationsQueryOptions, unreadCountQueryOptions } from '@/lib/notifications'
import { projectsQueryOptions } from '@/lib/projects'
import { tasksQueryOptions } from '@/lib/tasks'

const FEED_PAGE = { pageSize: 5 } as const

/**
 * Open work only. The tasks list orders by due date, so without the filter
 * completed tasks with past due dates would fill the card ahead of the work
 * that is still to do.
 */
const DEADLINES_FEED = { open: true, ...FEED_PAGE } as const

export const Route = createFileRoute('/_authed/')({
  loader: ({ context }) => {
    // The feed cards carry their own loading state, so they only need a
    // head start. The stats drive the attention card and the KPI row, which
    // are the page, so they are awaited.
    void context.queryClient.prefetchQuery(tasksQueryOptions(DEADLINES_FEED))
    void context.queryClient.prefetchQuery(activityQueryOptions(FEED_PAGE))
    void context.queryClient.prefetchQuery(projectsQueryOptions({ status: 'active', ...FEED_PAGE }))
    void context.queryClient.prefetchQuery(notificationsQueryOptions(FEED_PAGE))
    return context.queryClient.ensureQueryData(dashboardStatsQueryOptions())
  },
  component: HomePage,
})

/**
 * The role-based dashboard (sprint Phase 11), ordered by product §42: what
 * needs attention, then the current state, then upcoming work, then
 * activity. Counts come from `GET /api/dashboard`, computed server-side in
 * one snapshot; the feed cards reuse the module list endpoints, which are
 * already row-scoped, so an employee's "recent activity" is personal
 * activity without any extra filtering here.
 */
function HomePage() {
  const { user } = Route.useRouteContext()
  const role = user.role.name

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {role === 'admin'
              ? 'Organization overview'
              : role === 'manager'
                ? 'Delivery overview'
                : 'Your work at a glance'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuickActions role={role} />
          <Badge variant="secondary" className="capitalize">
            {role}
          </Badge>
        </div>
      </header>

      {role === 'employee' ? <EmployeeDashboard /> : <OrgDashboard role={role} />}
    </div>
  )
}

/**
 * Admin and manager share one layout: both see the whole table, so their
 * counts are identical — the difference is emphasis. Admin's current state
 * leads with the directory (users, departments), manager's with delivery.
 */
function OrgDashboard({ role }: { role: RoleName }) {
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions())
  const org = stats.org

  const attention: AttentionItem[] = [
    ...taskAttention(stats),
    {
      count: stats.projects.delayed,
      noun: ['delayed project', 'delayed projects'],
      link: linkOptions({ to: '/projects', search: { status: 'delayed' } }),
    },
    {
      count: stats.projects.overdue,
      noun: ['overdue project', 'overdue projects'],
      link: linkOptions({ to: '/projects', search: { overdue: 'true' } }),
    },
  ]

  const activeProjects: KpiProps = {
    label: 'Active projects',
    value: stats.projects.active,
    sub: subCount(stats.projects.total, 'total'),
    link: linkOptions({ to: '/projects', search: { status: 'active' } }),
  }

  const activeClients: KpiProps = {
    label: 'Active clients',
    value: org?.clients.active,
    sub: subCount(org?.clients.total, 'total'),
    link: linkOptions({ to: '/clients' }),
  }

  const kpis: KpiProps[] =
    role === 'admin'
      ? [
          activeProjects,
          {
            label: 'Open tasks',
            value: openTasks(stats),
            sub: subCount(stats.tasks.inProgress, 'in progress'),
            link: linkOptions({ to: '/tasks', search: { open: 'true' } }),
          },
          {
            label: 'Users',
            value: org?.users.total,
            sub: subCount(org?.users.active, 'active'),
            link: linkOptions({ to: '/users' }),
          },
          {
            label: 'Departments',
            value: org?.departments.total,
            link: linkOptions({ to: '/departments' }),
          },
          activeClients,
        ]
      : [
          activeProjects,
          {
            label: 'Open tasks',
            value: openTasks(stats),
            sub: subCount(stats.tasks.pending, 'pending'),
            link: linkOptions({ to: '/tasks', search: { open: 'true' } }),
          },
          {
            label: 'In progress',
            value: stats.tasks.inProgress,
            link: linkOptions({ to: '/tasks', search: { status: 'in_progress' } }),
          },
          {
            label: 'Team',
            value: org?.employees.total,
            sub: 'employees',
            link: linkOptions({ to: '/users' }),
          },
          activeClients,
        ]

  return (
    <>
      <AttentionCard items={attention} />
      <KpiGrid kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DeadlinesCard />
        <ProjectProgressCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityCard title={role === 'admin' ? 'System activity' : 'Recent activity'} />
        <NotificationsCard />
      </div>
    </>
  )
}

function EmployeeDashboard() {
  // `stats.org` is null for employees by contract; nothing below reads it.
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions())

  const kpis: KpiProps[] = [
    {
      label: 'Open tasks',
      value: openTasks(stats),
      sub: subCount(stats.tasks.pending, 'pending'),
      link: linkOptions({ to: '/tasks', search: { open: 'true' } }),
    },
    {
      label: 'In progress',
      value: stats.tasks.inProgress,
      link: linkOptions({ to: '/tasks', search: { status: 'in_progress' } }),
    },
    {
      label: 'Completed',
      value: stats.tasks.completed,
      link: linkOptions({ to: '/tasks', search: { status: 'completed' } }),
    },
    {
      label: 'My projects',
      value: stats.projects.active,
      sub: subCount(stats.projects.total, 'total'),
      link: linkOptions({ to: '/projects', search: { status: 'active' } }),
    },
  ]

  return (
    <>
      <AttentionCard items={taskAttention(stats)} />
      <KpiGrid kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DeadlinesCard />
        <ProjectProgressCard title="My projects" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityCard title="Personal activity" />
        <NotificationsCard />
      </div>
    </>
  )
}

/** Everything not completed: pending, in progress and blocked. */
function openTasks(stats: DashboardStats): number {
  return stats.tasks.total - stats.tasks.completed
}

type AttentionItem = {
  count: number
  /** Singular and plural, so one item reads "1 blocked task". */
  noun: readonly [string, string]
  link: LinkOptions
}

/** The task half of the attention card, shared by every role. */
function taskAttention(stats: DashboardStats): AttentionItem[] {
  return [
    {
      count: stats.tasks.overdue,
      noun: ['overdue task', 'overdue tasks'],
      link: linkOptions({ to: '/tasks', search: { overdue: 'true' } }),
    },
    {
      count: stats.tasks.blocked,
      noun: ['blocked task', 'blocked tasks'],
      link: linkOptions({ to: '/tasks', search: { status: 'blocked' } }),
    },
  ]
}

/**
 * Critical information first (product §42): the work that is already late or
 * stuck. Only non-zero items render, so a healthy organisation sees one calm
 * line rather than a row of red zeros, and each item opens the list filtered
 * to exactly those rows.
 */
function AttentionCard({ items }: { items: AttentionItem[] }) {
  const pressing = items.filter((item) => item.count > 0)

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {pressing.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-tone-success-foreground" aria-hidden />
            Nothing overdue or blocked.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {pressing.map((item) => (
              <li key={item.noun[1]}>
                <Link
                  {...item.link}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                >
                  <span className="rounded-md bg-tone-danger px-1.5 font-semibold tabular-nums text-tone-danger-foreground">
                    {item.count}
                  </span>
                  {item.count === 1 ? item.noun[0] : item.noun[1]}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

type KpiProps = {
  label: string
  value: number | undefined
  sub?: string
  link: LinkOptions
}

function KpiGrid({ kpis }: { kpis: KpiProps[] }) {
  // Both column counts are spelled out so Tailwind generates them.
  const columns = kpis.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'

  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${columns}`}>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, link }: KpiProps) {
  return (
    <Link {...link} className="min-w-0">
      <Card className="h-full gap-1 py-4 transition-colors hover:bg-accent/50">
        <CardHeader className="px-4">
          <CardTitle className="truncate text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {value === undefined ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
          )}
          {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
        </CardContent>
      </Card>
    </Link>
  )
}

function subCount(value: number | undefined, noun: string): string | undefined {
  return value === undefined ? undefined : `${value} ${noun}`
}

/** Every action the role's write permissions allow, and nothing more. */
function QuickActions({ role }: { role: RoleName }) {
  const actions = [
    { to: '/projects/new', label: 'New project', permission: 'projects:write' as const },
    { to: '/tasks/new', label: 'New task', permission: 'tasks:write' as const },
    { to: '/clients/new', label: 'New client', permission: 'clients:write' as const },
    { to: '/users/new', label: 'New user', permission: 'users:write' as const },
  ].filter((action) => can(role, action.permission))

  // Rendered into the header's own flex row, so no wrapper of its own.
  return (
    <>
      {actions.map((action) => (
        <Button key={action.to} asChild variant="outline" size="sm">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      ))}
    </>
  )
}

/**
 * The tasks list orders by due date ascending with nulls last, so the first
 * page of open work is exactly "what needs attention next" — overdue items
 * surface first by construction.
 */
function DeadlinesCard() {
  const tasks = useQuery(tasksQueryOptions(DEADLINES_FEED))

  return (
    <FeedCard
      title="Upcoming deadlines"
      to="/tasks"
      linkLabel="All tasks"
      query={tasks}
      empty="No open tasks."
    >
      {(items: TaskListItem[]) => (
        <ul className="flex flex-col gap-3">
          {items.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: task.id }}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {task.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{task.project.name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <DueDate value={task.dueDate} completed={task.status === 'completed'} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </FeedCard>
  )
}

function DueDate({ value, completed }: { value: string | null; completed: boolean }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const overdue = !completed && value < utcToday()

  return (
    <span
      className={`text-xs tabular-nums ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {value}
    </span>
  )
}

/** Date-only ISO string for lexicographic comparison with `@db.Date` values. */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function ActivityCard({ title }: { title: string }) {
  const activity = useQuery(activityQueryOptions(FEED_PAGE))

  return (
    <FeedCard
      title={title}
      to="/activity"
      linkLabel="All activity"
      query={activity}
      empty="No activity yet."
    >
      {(items: ActivityListItem[]) => (
        <ul className="flex flex-col gap-3">
          {items.map((event) => (
            <li key={event.id} className="text-sm">
              <p className="truncate">
                {event.description ?? `${event.entityType} ${event.action.replaceAll('_', ' ')}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.actor?.name ?? 'System'} · {formatWhen(event.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </FeedCard>
  )
}

function ProjectProgressCard({ title = 'Project progress' }: { title?: string }) {
  const projects = useQuery(projectsQueryOptions({ status: 'active', ...FEED_PAGE }))

  return (
    <FeedCard
      title={title}
      to="/projects"
      linkLabel="All projects"
      query={projects}
      empty="No active projects."
    >
      {(items: ProjectListItem[]) => (
        <ul className="flex flex-col gap-3">
          {items.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-3">
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="min-w-0 truncate text-sm font-medium hover:underline"
              >
                {project.name}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={project.status} />
                <ProgressBar value={project.progress} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </FeedCard>
  )
}

function NotificationsCard() {
  const unread = useQuery(unreadCountQueryOptions())
  const notifications = useQuery(notificationsQueryOptions(FEED_PAGE))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Notifications
          {unread.data && unread.data.count > 0 ? (
            <Badge variant="destructive">{unread.data.count} unread</Badge>
          ) : null}
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to="/notifications">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FeedBody query={notifications} empty="No notifications yet.">
          {(items) => (
            <ul className="flex flex-col gap-3">
              {items.map((notification) => (
                <li key={notification.id} className="text-sm">
                  <p className={`truncate ${notification.isRead ? '' : 'font-medium'}`}>
                    {notification.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {notification.message} · {formatWhen(notification.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </FeedBody>
      </CardContent>
    </Card>
  )
}

/** The shared shell of every feed card: title, "view all" link, list states. */
function FeedCard<T>({
  title,
  to,
  linkLabel,
  query,
  empty,
  children,
}: {
  title: string
  to: string
  linkLabel: string
  query: FeedQuery<T>
  empty: string
  children: (items: T[]) => ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={to}>{linkLabel}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FeedBody query={query} empty={empty}>
          {children}
        </FeedBody>
      </CardContent>
    </Card>
  )
}

type FeedQuery<T> = {
  isPending: boolean
  isError: boolean
  error: Error | null
  data?: { items: T[] }
}

function FeedBody<T>({
  query,
  empty,
  children,
}: {
  query: FeedQuery<T>
  empty: string
  children: (items: T[]) => ReactNode
}) {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    )
  }

  if (query.isError) {
    return <p className="text-sm text-muted-foreground">{describeError(query.error)}</p>
  }

  if (!query.data || query.data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }

  return children(query.data.items)
}

function describeError(error: Error | null): string {
  if (error instanceof ApiRequestError && error.code === 'FORBIDDEN') {
    return 'You do not have permission to view this.'
  }

  return error?.message ?? 'Something went wrong.'
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString()
}
