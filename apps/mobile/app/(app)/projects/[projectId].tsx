import type { ProjectDetail } from '@opsflow/types/project'
import type { TaskListItem } from '@opsflow/types/task'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { Card } from '@/components/card'
import { DetailRow } from '@/components/detail-row'
import { describeError, Message } from '@/components/message'
import { ProgressBar } from '@/components/progress-bar'
import { PriorityBadge, ProjectStatusBadge, StatusBadge } from '@/components/status-badge'
import { useCurrentUser } from '@/lib/current-user'
import { isOverdue, isProjectOverdue } from '@/lib/dates'
import { projectQueryOptions } from '@/lib/projects'
import { tasksQueryOptions } from '@/lib/tasks'

/**
 * Read-only view of one project: what it is, who is on it, and its tasks.
 * The task list goes through `GET /api/tasks`, so an employee sees only
 * the tasks assigned to them while the `taskCount` on the project itself
 * is the whole project's — the copy says which is which.
 */
export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const user = useCurrentUser()
  const project = useQuery(projectQueryOptions(projectId))
  const tasks = useQuery(tasksQueryOptions({ projectId, pageSize: 100 }))

  if (project.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (project.isError) {
    return (
      <View className="flex-1 bg-neutral-100 px-4">
        <Message
          title="Project unavailable"
          body={describeError(project.error)}
          onRetry={() => project.refetch()}
        />
      </View>
    )
  }

  const { data } = project
  const overdue = isProjectOverdue(data.deadline, data.status)
  const employee = user?.role.name === 'employee'

  return (
    <ScrollView
      className="flex-1 bg-neutral-100"
      contentContainerClassName="gap-4 p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={project.isRefetching || tasks.isRefetching}
          onRefresh={() => {
            void project.refetch()
            void tasks.refetch()
          }}
        />
      }
    >
      <Card>
        <Text className="text-xl font-semibold text-neutral-900">{data.name}</Text>
        <Text className="text-sm text-neutral-500">{data.client?.name ?? 'No client'}</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <ProjectStatusBadge status={data.status} />
          <PriorityBadge priority={data.priority} />
        </View>
        <ProgressBar value={data.progress} />
      </Card>

      <Card>
        <DetailRow label="Manager" value={data.manager?.name ?? 'Unassigned'} />
        <DetailRow label="Start date" value={data.startDate ?? 'Not set'} />
        <DetailRow
          label="Deadline"
          value={
            data.deadline ? (overdue ? `${data.deadline} · overdue` : data.deadline) : 'Not set'
          }
          tone={overdue ? 'alert' : 'default'}
        />
        <DetailRow
          label="Team"
          value={`${data.memberCount} ${data.memberCount === 1 ? 'member' : 'members'}`}
        />
        <DetailRow label="Tasks" value={String(data.taskCount)} />
        <DetailRow label="Created" value={data.createdAt.slice(0, 10)} />
        <View className="gap-1">
          <Text className="text-sm text-neutral-500">Description</Text>
          <Text className="text-sm text-neutral-900">{data.description ?? 'None'}</Text>
        </View>
      </Card>

      <TeamCard project={data} />

      <Card>
        <View className="gap-0.5">
          <Text className="text-base font-semibold text-neutral-900">
            {employee ? 'Your tasks on this project' : 'Tasks'}
          </Text>
          {tasks.data ? (
            <Text className="text-xs text-neutral-500">
              {tasks.data.total} {tasks.data.total === 1 ? 'task' : 'tasks'}
              {employee ? ' assigned to you' : ''}
            </Text>
          ) : null}
        </View>
        {tasks.isPending ? (
          <ActivityIndicator />
        ) : tasks.isError ? (
          <Text className="text-sm text-red-600">{describeError(tasks.error)}</Text>
        ) : tasks.data.items.length === 0 ? (
          <Text className="text-sm text-neutral-500">
            {employee ? 'Nothing on this project is assigned to you.' : 'No tasks yet.'}
          </Text>
        ) : (
          <View className="gap-3">
            {tasks.data.items.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  )
}

/** The manager first, then members alphabetically as the API orders them. */
function TeamCard({ project }: { project: ProjectDetail }) {
  const members = project.members.filter((member) => member.user.id !== project.manager?.id)

  return (
    <Card>
      <Text className="text-base font-semibold text-neutral-900">Team</Text>
      {!project.manager && members.length === 0 ? (
        <Text className="text-sm text-neutral-500">Nobody has been assigned yet.</Text>
      ) : (
        <View className="gap-2">
          {project.manager ? (
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm text-neutral-900">{project.manager.name}</Text>
              <Text className="text-xs font-medium text-neutral-500">Manager</Text>
            </View>
          ) : null}
          {members.map((member) => (
            <Text key={member.id} className="text-sm text-neutral-900">
              {member.user.name}
            </Text>
          ))}
        </View>
      )}
    </Card>
  )
}

function TaskRow({ task }: { task: TaskListItem }) {
  const overdue = isOverdue(task.dueDate, task.status === 'completed')

  return (
    <Link href={{ pathname: '/tasks/[taskId]', params: { taskId: task.id } }} asChild>
      <Pressable accessibilityRole="button" className="gap-1.5 active:opacity-70">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm font-medium text-neutral-900" numberOfLines={1}>
            {task.title}
          </Text>
          <StatusBadge status={task.status} />
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-xs text-neutral-500">{task.assignee?.name ?? 'Unassigned'}</Text>
          <PriorityBadge priority={task.priority} />
          {task.dueDate ? (
            <Text className={`text-xs ${overdue ? 'text-red-600' : 'text-neutral-500'}`}>
              {overdue ? `Overdue · ${task.dueDate}` : `Due ${task.dueDate}`}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  )
}
