import {
  nextProjectStatuses,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type ProjectDetail,
  type ProjectStatus,
} from '@opsflow/types/project'
import type { TaskListItem } from '@opsflow/types/task'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { DetailRow } from '@/components/detail-row'
import { ErrorText } from '@/components/error-text'
import { InlineConfirm } from '@/components/inline-confirm'
import { describeError, Message } from '@/components/message'
import { Picker } from '@/components/picker'
import { ProgressBar } from '@/components/progress-bar'
import {
  PriorityBadge,
  ProjectStatusBadge,
  projectStatusLabel,
  StatusBadge,
} from '@/components/status-badge'
import { clientKeys } from '@/lib/clients'
import { useCan, useCurrentUser } from '@/lib/current-user'
import { isOverdue, isProjectOverdue } from '@/lib/dates'
import {
  addProjectMember,
  projectKeys,
  projectQueryOptions,
  removeProjectMember,
  updateProjectPriority,
  updateProjectStatus,
} from '@/lib/projects'
import { tasksQueryOptions } from '@/lib/tasks'
import { usersQueryOptions } from '@/lib/users'

const PRIORITY_OPTIONS = PRIORITY_LEVELS.map((level) => ({ value: level, label: level }))

/**
 * One project: what it is, who is on it, and its tasks. Roles with
 * `projects:write` also edit it, move its status, set its priority and
 * staff it from here; `tasks:write` adds tasks to it. The task list goes
 * through `GET /api/tasks`, so an employee sees only the tasks assigned to
 * them while the `taskCount` on the project itself is the whole project's.
 */
export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const router = useRouter()
  const user = useCurrentUser()
  const canWrite = useCan('projects:write')
  const canWriteTasks = useCan('tasks:write')
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
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xl font-semibold text-neutral-900">{data.name}</Text>
            <Text className="text-sm text-neutral-500">{data.client?.name ?? 'No client'}</Text>
          </View>
          {canWrite ? (
            <Button
              title="Edit"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/projects/[projectId]/edit',
                  params: { projectId: data.id },
                })
              }
            />
          ) : null}
        </View>
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

      {canWrite ? (
        <>
          <StatusControl projectId={data.id} name={data.name} current={data.status} />
          <PriorityControl projectId={data.id} current={data.priority} />
        </>
      ) : null}

      <TeamCard project={data} canWrite={canWrite} />

      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
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
          {canWriteTasks ? (
            <Button
              title="Add task"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({ pathname: '/tasks/new', params: { projectId: data.id } })
              }
            />
          ) : null}
        </View>
        {tasks.isPending ? (
          <ActivityIndicator />
        ) : tasks.isError ? (
          <ErrorText>{describeError(tasks.error)}</ErrorText>
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

function StatusControl({
  projectId,
  name,
  current,
}: {
  projectId: string
  name: string
  current: ProjectStatus
}) {
  const queryClient = useQueryClient()
  const [next, setNext] = useState<ProjectStatus | null>(null)

  const mutation = useMutation({
    mutationFn: (status: ProjectStatus) => updateProjectStatus(projectId, { status }),
    onSuccess: async (saved) => {
      setNext(null)
      queryClient.setQueryData(projectKeys.detail(projectId), saved)
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })

  return (
    <Card>
      <Text className="text-sm font-medium text-neutral-800">Change status</Text>
      {next ? (
        <InlineConfirm
          message={`Mark ${name} as ${projectStatusLabel(next).toLowerCase()}?`}
          confirmLabel="Confirm"
          destructive={next === 'cancelled' || next === 'delayed'}
          pending={mutation.isPending}
          error={mutation.error}
          onCancel={() => {
            mutation.reset()
            setNext(null)
          }}
          onConfirm={() => mutation.mutate(next)}
        />
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {nextProjectStatuses(current).length ? (
            nextProjectStatuses(current).map((status) => (
              <Button
                key={status}
                title={projectStatusLabel(status)}
                variant={status === 'cancelled' || status === 'delayed' ? 'destructive' : 'outline'}
                size="sm"
                onPress={() => setNext(status)}
              />
            ))
          ) : (
            // `cancelled` is the one terminal status. Say so, rather than
            // leaving the row where the controls were silently empty.
            <Text className="text-sm text-neutral-500">
              A cancelled project cannot be reopened. Its team and history stay in place.
            </Text>
          )}
        </View>
      )}
    </Card>
  )
}

function PriorityControl({ projectId, current }: { projectId: string; current: PriorityLevel }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (priority: PriorityLevel) => updateProjectPriority(projectId, { priority }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(projectKeys.detail(projectId), saved)
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })

  return (
    <Card>
      <Picker
        label="Priority"
        value={current}
        options={PRIORITY_OPTIONS}
        onChange={(value) => mutation.mutate(value as PriorityLevel)}
        disabled={mutation.isPending}
        loading={mutation.isPending}
      />
      {mutation.isError ? <ErrorText>{describeError(mutation.error)}</ErrorText> : null}
    </Card>
  )
}

/**
 * The manager first, then members alphabetically as the API orders them.
 * With `projects:write`, members can be removed and any active person who
 * is not yet on the project can be added.
 */
function TeamCard({ project, canWrite }: { project: ProjectDetail; canWrite: boolean }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState('')
  const members = project.members.filter((member) => member.user.id !== project.manager?.id)
  const memberIds = new Set(project.members.map((member) => member.user.id))

  const people = useQuery({
    ...usersQueryOptions({ status: 'active', pageSize: 100 }),
    enabled: canWrite,
  })
  const candidates = (people.data?.items ?? [])
    .filter((person) => !memberIds.has(person.id))
    .map((person) => ({ value: person.id, label: person.name, hint: person.position ?? undefined }))

  const settle = async (saved: ProjectDetail) => {
    queryClient.setQueryData(projectKeys.detail(project.id), saved)
    await queryClient.invalidateQueries({ queryKey: projectKeys.all })
    await queryClient.invalidateQueries({ queryKey: clientKeys.all })
  }

  const add = useMutation({
    mutationFn: (userId: string) => addProjectMember(project.id, { userId }),
    onSuccess: async (saved) => {
      setSelected('')
      await settle(saved)
    },
  })

  const remove = useMutation({
    mutationFn: (userId: string) => removeProjectMember(project.id, userId),
    onSuccess: settle,
  })

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
            <View key={member.id} className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm text-neutral-900">{member.user.name}</Text>
              {canWrite ? (
                <Button
                  title="Remove"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onPress={() => remove.mutate(member.user.id)}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}

      {canWrite ? (
        <View className="gap-2 border-t border-neutral-200 pt-3">
          <Picker
            label="Add a member"
            value={selected}
            options={candidates}
            onChange={setSelected}
            placeholder="Choose a person"
            loading={people.isPending}
          />
          <Button
            title={add.isPending ? 'Adding…' : 'Add to team'}
            variant="outline"
            disabled={selected === '' || add.isPending}
            onPress={() => add.mutate(selected)}
          />
          {add.isError || remove.isError ? (
            <ErrorText>{describeError(add.error ?? remove.error)}</ErrorText>
          ) : null}
        </View>
      ) : null}
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
            <Text
              className={`text-xs ${overdue ? 'text-tone-danger-foreground' : 'text-neutral-500'}`}
            >
              {overdue ? `Overdue · ${task.dueDate}` : `Due ${task.dueDate}`}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  )
}
