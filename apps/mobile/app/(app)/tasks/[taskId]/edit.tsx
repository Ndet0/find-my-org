import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { describeError, Message } from '@/components/message'
import { TaskForm } from '@/forms/task-form'
import { taskQueryOptions } from '@/lib/tasks'

export default function EditTaskScreen() {
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

  return <TaskForm task={task.data} />
}
