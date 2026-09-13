import type { TaskListItem } from '@opsflow/types/task'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { PressableCard } from '@/components/card'
import { ListFooter } from '@/components/list-footer'
import { describeError, Message } from '@/components/message'
import { Screen } from '@/components/screen'
import { Segmented } from '@/components/segmented'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { useCan, useCurrentUser } from '@/lib/current-user'
import { isOverdue } from '@/lib/dates'
import { flattenPages, loadMore, pagedCountLabel, pagedTotal } from '@/lib/paged'
import { tasksInfiniteQueryOptions } from '@/lib/tasks'

type Scope = 'mine' | 'all'

/**
 * The tasks assigned to the signed-in user, and — for roles that manage
 * work — everything they can see. The API already scopes an employee to
 * their own assignments; the explicit `assignedTo` makes "mine" mean the
 * same thing for a manager. Lists are ordered by due date on the server,
 * so overdue work surfaces first without any sorting here, and a page at a
 * time: the next one loads as the list reaches its end.
 */
export default function TasksScreen() {
  const user = useCurrentUser()
  const router = useRouter()
  const canWrite = useCan('tasks:write')
  const [scope, setScope] = useState<Scope>('mine')
  const mine = scope === 'mine' || !canWrite
  const tasks = useInfiniteQuery({
    ...tasksInfiniteQueryOptions(mine ? { assignedTo: user?.id ?? '' } : {}),
    enabled: user !== null,
  })
  const items = flattenPages(tasks.data)

  if (!user) {
    return null
  }

  const count = pagedCountLabel(items.length, pagedTotal(tasks.data), 'task', 'tasks')

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3 py-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {mine ? 'My tasks' : 'All tasks'}
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {count === undefined
              ? mine
                ? 'Work assigned to you, soonest due first'
                : 'Every task you can see, soonest due first'
              : mine
                ? `${count} assigned to you`
                : count}
          </Text>
        </View>
        {canWrite ? (
          <Button title="Add" size="sm" onPress={() => router.push('/tasks/new')} />
        ) : null}
      </View>

      {canWrite ? (
        <View className="pb-3">
          <Segmented
            value={scope}
            options={[
              { value: 'mine', label: 'Mine' },
              { value: 'all', label: 'All' },
            ]}
            onChange={setScope}
          />
        </View>
      ) : null}

      {tasks.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : tasks.isError && items.length === 0 ? (
        <Message
          title="Tasks could not be loaded"
          body={describeError(tasks.error)}
          onRetry={() => tasks.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(task) => task.id}
          renderItem={({ item }) => <TaskRow task={item} showAssignee={!mine} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          onEndReached={loadMore(tasks)}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            <ListFooter loading={tasks.isFetchingNextPage} failed={tasks.isFetchNextPageError} />
          }
          ListEmptyComponent={
            mine ? (
              <Message title="Nothing assigned to you" body="New assignments will appear here." />
            ) : (
              <Message title="No tasks yet" body="Add one with the button above." />
            )
          }
          refreshControl={
            <RefreshControl refreshing={tasks.isRefetching} onRefresh={() => tasks.refetch()} />
          }
        />
      )}
    </Screen>
  )
}

function TaskRow({ task, showAssignee }: { task: TaskListItem; showAssignee: boolean }) {
  const overdue = isOverdue(task.dueDate, task.status === 'completed')

  return (
    <Link href={{ pathname: '/tasks/[taskId]', params: { taskId: task.id } }} asChild>
      <PressableCard className="gap-2">
        <Text
          className="text-base font-medium text-neutral-900 dark:text-neutral-50"
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {task.project.name}
          {showAssignee ? ` · ${task.assignee?.name ?? 'Unassigned'}` : ''}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.dueDate ? (
            <Text
              className={`text-xs ${overdue ? 'text-tone-danger-foreground' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              {overdue ? `Overdue · ${task.dueDate}` : `Due ${task.dueDate}`}
            </Text>
          ) : null}
        </View>
      </PressableCard>
    </Link>
  )
}
