import { PRIORITY_LEVELS, type PriorityLevel } from '@opsflow/types/project'
import { nextTaskStatuses, type TaskStatus } from '@opsflow/types/task'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { DetailRow } from '@/components/detail-row'
import { ErrorText } from '@/components/error-text'
import { InlineConfirm } from '@/components/inline-confirm'
import { describeError, Message } from '@/components/message'
import { Picker } from '@/components/picker'
import { PriorityBadge, StatusBadge, taskStatusLabel } from '@/components/status-badge'
import { useCan } from '@/lib/current-user'
import { isOverdue } from '@/lib/dates'
import { projectKeys } from '@/lib/projects'
import {
  deleteTask,
  taskKeys,
  taskQueryOptions,
  updateTaskPriority,
  updateTaskStatus,
} from '@/lib/tasks'

const PRIORITY_OPTIONS = PRIORITY_LEVELS.map((level) => ({ value: level, label: level }))

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>()
  const router = useRouter()
  const task = useQuery(taskQueryOptions(taskId))
  const canWrite = useCan('tasks:write')

  if (task.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (task.isError) {
    return (
      <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
        <Message
          title="Task unavailable"
          body={describeError(task.error)}
          onRetry={() => task.refetch()}
        />
      </View>
    )
  }

  const { data } = task
  const overdue = isOverdue(data.dueDate, data.status === 'completed')

  return (
    <ScrollView
      className="flex-1 bg-neutral-100 dark:bg-neutral-950"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {data.title}
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              {data.project.name}
            </Text>
          </View>
          {canWrite ? (
            <Button
              title="Edit"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({ pathname: '/tasks/[taskId]/edit', params: { taskId: data.id } })
              }
            />
          ) : null}
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          <PriorityBadge priority={data.priority} />
        </View>
      </Card>

      <Card>
        <DetailRow label="Assignee" value={data.assignee?.name ?? 'Unassigned'} />
        <DetailRow
          label="Due date"
          value={data.dueDate ? (overdue ? `${data.dueDate} · overdue` : data.dueDate) : 'Not set'}
          tone={overdue ? 'alert' : 'default'}
        />
        <DetailRow label="Created by" value={data.creator?.name ?? 'Unknown'} />
        <DetailRow
          label="Completed"
          value={data.completedAt ? data.completedAt.slice(0, 10) : '—'}
        />
        <View className="gap-1">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Description</Text>
          <Text className="text-sm text-neutral-900 dark:text-neutral-50">
            {data.description ?? 'None'}
          </Text>
        </View>
      </Card>

      <StatusControl taskId={data.id} title={data.title} current={data.status} />

      {canWrite ? (
        <>
          <PriorityControl taskId={data.id} current={data.priority} />
          <DeleteControl taskId={data.id} title={data.title} />
        </>
      ) : null}
    </ScrollView>
  )
}

/**
 * Moves the task through its states. Every role that can see the task may
 * change its status, which is the whole point of the mobile app for an
 * employee.
 */
function StatusControl({
  taskId,
  title,
  current,
}: {
  taskId: string
  title: string
  current: TaskStatus
}) {
  const queryClient = useQueryClient()
  const [next, setNext] = useState<TaskStatus | null>(null)

  const mutation = useMutation({
    mutationFn: (status: TaskStatus) => updateTaskStatus(taskId, { status }),
    onSuccess: async () => {
      setNext(null)
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })

  return (
    <Card>
      <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Change status
      </Text>

      {next ? (
        <InlineConfirm
          message={`Mark "${title}" as ${taskStatusLabel(next).toLowerCase()}?`}
          confirmLabel="Confirm"
          destructive={next === 'blocked'}
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
          {nextTaskStatuses(current).map((status) => (
            <Button
              key={status}
              title={taskStatusLabel(status)}
              variant={status === 'blocked' ? 'destructive' : 'outline'}
              onPress={() => setNext(status)}
            />
          ))}
        </View>
      )}
    </Card>
  )
}

/** Priority changes at once from the picker; the web does the same from its select. */
function PriorityControl({ taskId, current }: { taskId: string; current: PriorityLevel }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (priority: PriorityLevel) => updateTaskPriority(taskId, { priority }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(taskKeys.detail(taskId), saved)
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
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

function DeleteControl({ taskId, title }: { taskId: string; title: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      // Leave first: invalidating while this screen is mounted would refetch
      // a task that no longer exists and flash a 404 on the way out.
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/tasks')
      }

      queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })

  return (
    <Card>
      {confirming ? (
        <InlineConfirm
          message={`Delete "${title}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          pending={mutation.isPending}
          error={mutation.error}
          onCancel={() => {
            mutation.reset()
            setConfirming(false)
          }}
          onConfirm={() => mutation.mutate()}
        />
      ) : (
        <Button title="Delete task" variant="destructive" onPress={() => setConfirming(true)} />
      )}
    </Card>
  )
}
