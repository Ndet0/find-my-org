import type { TaskListItem } from '@opsflow/types/task'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { describeError, Message } from '@/components/message'
import { Screen } from '@/components/screen'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { useCurrentUser } from '@/lib/current-user'
import { isOverdue } from '@/lib/dates'
import { tasksQueryOptions } from '@/lib/tasks'

/**
 * The tasks assigned to the signed-in user. The API already scopes an
 * employee to their own assignments; the explicit `assignedTo` makes the
 * screen mean the same thing for a manager, whose unfiltered list would be
 * everything they can see. The list is ordered by due date on the server,
 * so overdue work surfaces first without any sorting here.
 */
export default function MyTasksScreen() {
  const user = useCurrentUser()
  const tasks = useQuery({
    ...tasksQueryOptions({ assignedTo: user?.id ?? '', pageSize: 100 }),
    enabled: user !== null,
  })

  if (!user) {
    return null
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text className="text-2xl font-semibold text-neutral-900">My tasks</Text>
        <Text className="text-sm text-neutral-500">
          {tasks.data
            ? `${tasks.data.total} ${tasks.data.total === 1 ? 'task' : 'tasks'} assigned to you`
            : 'Work assigned to you, soonest due first'}
        </Text>
      </View>

      {tasks.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : tasks.isError ? (
        <Message
          title="Tasks could not be loaded"
          body={describeError(tasks.error)}
          onRetry={() => tasks.refetch()}
        />
      ) : (
        <FlatList
          data={tasks.data.items}
          keyExtractor={(task) => task.id}
          renderItem={({ item }) => <TaskRow task={item} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            <Message title="Nothing assigned to you" body="New assignments will appear here." />
          }
          refreshControl={
            <RefreshControl refreshing={tasks.isRefetching} onRefresh={() => tasks.refetch()} />
          }
        />
      )}
    </Screen>
  )
}

function TaskRow({ task }: { task: TaskListItem }) {
  const overdue = isOverdue(task.dueDate, task.status === 'completed')

  return (
    <Link href={{ pathname: '/tasks/[taskId]', params: { taskId: task.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className="gap-2 rounded-xl border border-neutral-200 bg-white p-4 active:bg-neutral-50"
      >
        <Text className="text-base font-medium text-neutral-900" numberOfLines={2}>
          {task.title}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={1}>
          {task.project.name}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
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
