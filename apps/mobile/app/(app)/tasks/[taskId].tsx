import { TASK_STATUSES, type TaskStatus } from '@opsflow/types/task'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { describeError, Message } from '@/components/message'
import { PriorityBadge, StatusBadge, taskStatusLabel } from '@/components/status-badge'
import { isOverdue } from '@/lib/dates'
import { taskKeys, taskQueryOptions, updateTaskStatus } from '@/lib/tasks'

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>()
  const task = useQuery(taskQueryOptions(taskId))

  if (task.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (task.isError) {
    return (
      <View className="flex-1 bg-neutral-100 px-4">
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
    <ScrollView className="flex-1 bg-neutral-100" contentContainerClassName="gap-4 p-4 pb-10">
      <View className="gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <Text className="text-xl font-semibold text-neutral-900">{data.title}</Text>
        <Text className="text-sm text-neutral-500">{data.project.name}</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          <PriorityBadge priority={data.priority} />
        </View>
      </View>

      <View className="gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <Row label="Assignee" value={data.assignee?.name ?? 'Unassigned'} />
        <Row
          label="Due date"
          value={data.dueDate ? (overdue ? `${data.dueDate} · overdue` : data.dueDate) : 'Not set'}
          tone={overdue ? 'alert' : 'default'}
        />
        <Row label="Created by" value={data.creator?.name ?? 'Unknown'} />
        <Row label="Completed" value={data.completedAt ? data.completedAt.slice(0, 10) : '—'} />
        <View className="gap-1">
          <Text className="text-sm text-neutral-500">Description</Text>
          <Text className="text-sm text-neutral-900">{data.description ?? 'None'}</Text>
        </View>
      </View>

      <StatusControl taskId={data.id} title={data.title} current={data.status} />
    </ScrollView>
  )
}

/**
 * Moves the task through its states. Every role that can see the task may
 * change its status, which is the whole point of the mobile app for an
 * employee. The confirmation is inline rather than a native alert because
 * the same screen has to work on the web build used for verification.
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
    <View className="gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <Text className="text-sm font-medium text-neutral-800">Change status</Text>

      {next ? (
        <View className="gap-3">
          <Text className="text-sm text-neutral-700">
            Mark "{title}" as {taskStatusLabel(next).toLowerCase()}?
          </Text>
          {mutation.isError ? (
            <Text className="text-sm text-red-600">{describeError(mutation.error)}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <Button
              title="Cancel"
              variant="outline"
              className="flex-1"
              disabled={mutation.isPending}
              onPress={() => {
                mutation.reset()
                setNext(null)
              }}
            />
            <Button
              title={mutation.isPending ? 'Saving…' : 'Confirm'}
              variant={next === 'blocked' ? 'destructive' : 'primary'}
              className="flex-1"
              disabled={mutation.isPending}
              onPress={() => mutation.mutate(next)}
            />
          </View>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {TASK_STATUSES.filter((status) => status !== current).map((status) => (
            <Button
              key={status}
              title={taskStatusLabel(status)}
              variant={status === 'blocked' ? 'destructive' : 'outline'}
              onPress={() => setNext(status)}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'alert'
}) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text
        className={`flex-1 text-right text-sm ${tone === 'alert' ? 'text-red-600' : 'text-neutral-900'}`}
      >
        {value}
      </Text>
    </View>
  )
}
