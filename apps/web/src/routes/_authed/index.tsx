import type { ActivityListItem } from '@opsflow/types/activity'
import { can, type RoleName } from '@opsflow/types/permissions'
import type { ProjectListItem } from '@opsflow/types/project'
import type { TaskListItem } from '@opsflow/types/task'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
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

export const Route = createFileRoute('/_authed/')({
  loader: ({ context }) => {
    // The feed cards carry their own loading state, so they only need a
    // head start. The KPI row is the page, so it is awaited.
    void context.queryClient.prefetchQuery(tasksQueryOptions(FEED_PAGE))
    void context.queryClient.prefetchQuery(activityQueryOptions(FEED_PAGE))
    void context.queryClient.prefetchQuery(projectsQueryOptions({ status: 'active', ...FEED_PAGE }))
    void context.queryClient.prefetchQuery(notificationsQueryOptions(FEED_PAGE))
    return context.queryClient.ensureQueryData(dashboardStatsQueryOptions())
  },
  component: HomePage,
})

/**
 * The role-based dashboard (sprint Phase 11). Counts come from
 * `GET /api/dashboard`, computed server-side in one snapshot; the feed cards
 * reuse the module list endpoints, which are already row-scoped, so an
 * employee's "recent activity" is personal activity without any extra
 * filtering here.
 */
function HomePage() {
  const { user } = Route.useRouteContext()
  const role = user.role.name

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
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
        <Badge variant="secondary" className="capitalize">
          {role}
        </Badge>
      </header>

      {role === 'employee' ? <EmployeeDashboard /> : <OrgDashboard role={role} />}
    </div>
  )
}

/**
 * Admin and manager share one layout: both see the whole table, so their
 * counts are identical — the difference is emphasis. Admin leads with the
 * directory (users, departments), manager with delivery (projects, tasks).
 */
function OrgDashboard({ role }: { role: RoleName }) {
  const stats = useSuspenseQuery(dashboardStatsQueryOptions())
  const org = stats.data.org ?? null

  const kpis: KpiProps[] =
    role === 'admin'
      ? [
          {
            label: 'Users',
            value: org?.users.total,
            sub: subCount(org?.users.active, 'active'),
            to: '/users',
          },
          { label: 'Employees', value: org?.employees.total, to: '/users' },
          { label: 'Departments', value: org?.departments.total, to: '/departments' },
          {
            label: 'Active clients',
            value: org?.clients.active,
            sub: subCount(org?.clients.total, 'total'),
            to: '/clients',
          },
          {
            label: 'Active projects',
            value: stats.data.projects.active,
            sub: subCount(stats.data.projects.total, 'total'),
            to: '/projects',
          },
          {
            label: 'Overdue projects',
            value: stats.data.projects.overdue,
            alert: true,
            to: '/projects',
          },
          { label: 'Overdue tasks', value: stats.data.tasks.overdue, alert: true, to: '/tasks' },
        ]
      : [
          {
            label: 'Active projects',
            value: stats.data.projects.active,
            sub: subCount(stats.data.projects.total, 'total'),
            to: '/projects',
          },
          {
            label: 'Delayed projects',
            value: stats.data.projects.delayed,
            alert: true,
            to: '/projects',
          },
          {
            label: 'Overdue projects',
            value: stats.data.projects.overdue,
            alert: true,
            to: '/projects',
          },
          { label: 'Pending tasks', value: stats.data.tasks.pending, to: '/tasks' },
          { label: 'Overdue tasks', value: stats.data.tasks.overdue, alert: true, to: '/tasks' },
          { label: 'Team', value: org?.employees.total, sub: 'employees', to: '/users' },
          { label: 'Active clients', value: org?.clients.active, to: '/clients' },
        ]

  return (
    <>
      <KpiGrid kpis={kpis} />

      <QuickActions role={role} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectProgressCard />
        {role === 'admin' ? (
          <ActivityCard title="System activity" />
        ) : (
          <DeadlinesCard title="Upcoming deadlines" />
        )}
        {role === 'admin' ? <NotificationsCard /> : <ActivityCard title="Recent activity" />}
        {role === 'admin' ? null : <NotificationsCard />}
      </div>
    </>
  )
}

function EmployeeDashboard() {
  // `stats.org` is null for employees by contract; nothing below reads it.
  const stats = useSuspenseQuery(dashboardStatsQueryOptions())

  const kpis: KpiProps[] = [
    {
      label: 'My tasks',
      value: stats.data.tasks.total,
      sub: subCount(stats.data.tasks.pending, 'pending'),
      to: '/tasks',
    },
    { label: 'In progress', value: stats.data.tasks.inProgress, to: '/tasks' },
    { label: 'Overdue tasks', value: stats.data.tasks.overdue, alert: true, to: '/tasks' },
    {
      label: 'My projects',
      value: stats.data.projects.active,
      sub: subCount(stats.data.projects.total, 'total'),
      to: '/projects',
    },
    { label: 'Completed tasks', value: stats.data.tasks.completed, to: '/tasks' },
  ]

  return (
    <>
      <KpiGrid kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DeadlinesCard title="Upcoming deadlines" />
        <ProjectProgressCard title="My projects" />
        <ActivityCard title="Personal activity" />
        <NotificationsCard />
      </div>
    </>
  )
}

type KpiProps = {
  label: string
  value: number | undefined
  sub?: string
  /** Render the value in the destructive colour when it is above zero. */
  alert?: boolean
  to: string
}

function KpiGrid({ kpis }: { kpis: KpiProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, alert, to }: KpiProps) {
  return (
    <Link to={to} className="min-w-0">
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
            <div
              className={`text-2xl font-semibold tabular-nums ${alert && value > 0 ? 'text-destructive' : ''}`}
            >
              {value}
            </div>
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

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.to} asChild variant="outline" size="sm">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      ))}
    </div>
  )
}

/**
 * The tasks list already orders by due date ascending with nulls last, so
 * the first page is exactly "what needs attention next" — overdue items
 * surface first by construction.
 */
function DeadlinesCard({ title }: { title: string }) {
  const tasks = useQuery(tasksQueryOptions(FEED_PAGE))

  return (
    <FeedCard title={title} to="/tasks" linkLabel="All tasks" query={tasks} empty="No tasks yet.">
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
