import { Ionicons } from '@expo/vector-icons'
import type { Paginated } from '@opsflow/types/api'
import type { DashboardStats } from '@opsflow/types/dashboard'
import type { RoleName } from '@opsflow/types/permissions'
import type { ProjectListItem } from '@opsflow/types/project'
import type { TaskListItem } from '@opsflow/types/task'
import { colors } from '@opsflow/ui/colors'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { type Href, Link } from 'expo-router'
import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { Card } from '@/components/card'
import { describeError, Message } from '@/components/message'
import { ProgressBar } from '@/components/progress-bar'
import { Screen } from '@/components/screen'
import { PriorityBadge, ProjectStatusBadge } from '@/components/status-badge'
import { useCurrentUser } from '@/lib/current-user'
import { dashboardStatsQueryOptions } from '@/lib/dashboard'
import { isOverdue } from '@/lib/dates'
import { unreadCountQueryOptions } from '@/lib/notifications'
import { projectsQueryOptions } from '@/lib/projects'
import { tasksQueryOptions } from '@/lib/tasks'

const FEED = { pageSize: 5 } as const

/**
 * The role-based dashboard, reduced to what fits a phone. The counts are the
 * same `GET /api/dashboard` snapshot the web shows; the two feeds reuse the
 * list endpoints, which are already row-scoped, so an employee's deadlines
 * and projects are their own without any filtering here.
 */
export default function DashboardScreen() {
  const user = useCurrentUser()
  const stats = useQuery(dashboardStatsQueryOptions())
  const deadlines = useQuery(tasksQueryOptions(FEED))
  const projects = useQuery(projectsQueryOptions({ status: 'active', ...FEED }))
  const unread = useQuery(unreadCountQueryOptions())

  if (!user) {
    return null
  }

  const role = user.role.name
  const queries = [stats, deadlines, projects, unread]

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-4 py-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={queries.some((query) => query.isRefetching)}
            onRefresh={() => {
              for (const query of queries) {
                void query.refetch()
              }
            }}
          />
        }
      >
        <View className="gap-1">
          <Text className="text-2xl font-semibold text-neutral-900">Welcome back, {user.name}</Text>
          <Text className="text-sm text-neutral-500">
            {role === 'admin'
              ? 'Organization overview'
              : role === 'manager'
                ? 'Delivery overview'
                : 'Your work at a glance'}
          </Text>
        </View>

        {stats.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
          </View>
        ) : stats.isError ? (
          <Message
            title="Overview could not be loaded"
            body={describeError(stats.error)}
            onRetry={() => stats.refetch()}
          />
        ) : (
          <KpiGrid kpis={kpisFor(role, stats.data)} />
        )}

        <InboxCard count={unread.data?.count} />

        <FeedCard
          title="Upcoming deadlines"
          to="/tasks"
          linkLabel="My tasks"
          query={deadlines}
          empty="No tasks yet."
        >
          {(tasks) => tasks.map((task) => <DeadlineRow key={task.id} task={task} />)}
        </FeedCard>

        <FeedCard
          title={role === 'employee' ? 'My active projects' : 'Active projects'}
          to="/projects"
          linkLabel="All projects"
          query={projects}
          empty="No active projects."
        >
          {(items) => items.map((project) => <ProjectRow key={project.id} project={project} />)}
        </FeedCard>
      </ScrollView>
    </Screen>
  )
}

type Kpi = {
  label: string
  value: number | undefined
  sub?: string
  /** Render the value in red when it is above zero. */
  alert?: boolean
  /** Only set for modules the mobile app has a screen for. */
  to?: Href
}

/**
 * The same figures, in the same emphasis order, as the web dashboard.
 * Every count that has a mobile screen behind it opens that screen, for
 * the roles that may read it — an employee's tiles stay within their own
 * work, so none of them reach the directories.
 */
function kpisFor(role: RoleName, stats: DashboardStats): Kpi[] {
  const { projects, tasks, org } = stats

  if (role === 'employee') {
    return [
      {
        label: 'My tasks',
        value: tasks.total,
        sub: subCount(tasks.pending, 'pending'),
        to: '/tasks',
      },
      { label: 'In progress', value: tasks.inProgress, to: '/tasks' },
      { label: 'Overdue tasks', value: tasks.overdue, alert: true, to: '/tasks' },
      {
        label: 'My projects',
        value: projects.active,
        sub: subCount(projects.total, 'total'),
        to: '/projects',
      },
      { label: 'Completed tasks', value: tasks.completed, to: '/tasks' },
    ]
  }

  if (role === 'admin') {
    return [
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
        value: projects.active,
        sub: subCount(projects.total, 'total'),
        to: '/projects',
      },
      { label: 'Overdue projects', value: projects.overdue, alert: true, to: '/projects' },
      { label: 'Overdue tasks', value: tasks.overdue, alert: true, to: '/tasks' },
    ]
  }

  return [
    {
      label: 'Active projects',
      value: projects.active,
      sub: subCount(projects.total, 'total'),
      to: '/projects',
    },
    { label: 'Delayed projects', value: projects.delayed, alert: true, to: '/projects' },
    { label: 'Overdue projects', value: projects.overdue, alert: true, to: '/projects' },
    { label: 'Pending tasks', value: tasks.pending, to: '/tasks' },
    { label: 'Overdue tasks', value: tasks.overdue, alert: true, to: '/tasks' },
    { label: 'Team', value: org?.employees.total, sub: 'employees', to: '/users' },
    { label: 'Active clients', value: org?.clients.active, to: '/clients' },
  ]
}

function subCount(value: number | undefined, noun: string): string | undefined {
  return value === undefined ? undefined : `${value} ${noun}`
}

/** Two cards per row; an odd last card keeps its half width. */
function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  const rows: Kpi[][] = []

  for (let index = 0; index < kpis.length; index += 2) {
    rows.push(kpis.slice(index, index + 2))
  }

  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row.map((kpi) => kpi.label).join('|')} className="flex-row gap-3">
          {row.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  )
}

function KpiCard({ label, value, sub, alert, to }: Kpi) {
  const body = (
    <Card className="flex-1 gap-1">
      <Text className="text-xs font-medium text-neutral-500" numberOfLines={1}>
        {label}
      </Text>
      <Text
        className={`text-2xl font-semibold ${alert && value !== undefined && value > 0 ? 'text-red-600' : 'text-neutral-900'}`}
      >
        {value ?? '—'}
      </Text>
      {sub ? <Text className="text-xs text-neutral-500">{sub}</Text> : null}
    </Card>
  )

  if (!to) {
    return body
  }

  return (
    <Link href={to} asChild>
      <Pressable accessibilityRole="button" className="flex-1 active:opacity-70">
        {body}
      </Pressable>
    </Link>
  )
}

function InboxCard({ count }: { count: number | undefined }) {
  return (
    <Link href="/notifications" asChild>
      <Pressable accessibilityRole="button" className="active:opacity-70">
        <Card className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text className="text-base font-semibold text-neutral-900">Inbox</Text>
            <Text className="text-sm text-neutral-500">
              {count === undefined
                ? 'Loading…'
                : count === 0
                  ? 'You are all caught up'
                  : `${count} unread ${count === 1 ? 'notification' : 'notifications'}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
        </Card>
      </Pressable>
    </Link>
  )
}

function FeedCard<T>({
  title,
  to,
  linkLabel,
  query,
  empty,
  children,
}: {
  title: string
  to: Href
  linkLabel: string
  query: UseQueryResult<Paginated<T>>
  empty: string
  children: (items: T[]) => ReactNode
}) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-neutral-900">{title}</Text>
        <Link href={to} asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text className="text-sm text-neutral-600">{linkLabel}</Text>
          </Pressable>
        </Link>
      </View>
      {query.isPending ? (
        <ActivityIndicator />
      ) : query.isError ? (
        <Text className="text-sm text-red-600">{describeError(query.error)}</Text>
      ) : query.data.items.length === 0 ? (
        <Text className="text-sm text-neutral-500">{empty}</Text>
      ) : (
        <View className="gap-3">{children(query.data.items)}</View>
      )}
    </Card>
  )
}

function DeadlineRow({ task }: { task: TaskListItem }) {
  const overdue = isOverdue(task.dueDate, task.status === 'completed')

  return (
    <Link href={{ pathname: '/tasks/[taskId]', params: { taskId: task.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
            {task.title}
          </Text>
          <Text className="text-xs text-neutral-500" numberOfLines={1}>
            {task.project.name}
          </Text>
        </View>
        <PriorityBadge priority={task.priority} />
        <Text className={`text-xs ${overdue ? 'text-red-600' : 'text-neutral-500'}`}>
          {task.dueDate ?? '—'}
        </Text>
      </Pressable>
    </Link>
  )
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  return (
    <Link href={{ pathname: '/projects/[projectId]', params: { projectId: project.id } }} asChild>
      <Pressable accessibilityRole="button" className="gap-1.5 active:opacity-70">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm font-medium text-neutral-900" numberOfLines={1}>
            {project.name}
          </Text>
          <ProjectStatusBadge status={project.status} />
        </View>
        <ProgressBar value={project.progress} />
      </Pressable>
    </Link>
  )
}
