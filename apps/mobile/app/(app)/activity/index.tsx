import {
  ACTIVITY_ENTITY_TYPES,
  type ActivityEntityType,
  type ActivityListItem,
} from '@opsflow/types/activity'
import type { RoleName } from '@opsflow/types/permissions'
import { can } from '@opsflow/types/permissions'
import { toneLabel } from '@opsflow/ui/tones'
import { useQuery } from '@tanstack/react-query'
import { type Href, Link } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { ChipRow } from '@/components/filter-chip'
import { describeError, Message } from '@/components/message'
import { Badge } from '@/components/status-badge'
import { activityQueryOptions } from '@/lib/activity'
import { useCurrentUser } from '@/lib/current-user'
import { formatDateTime } from '@/lib/dates'

type Filter = 'all' | ActivityEntityType

/**
 * The activity trail, newest first. Every role reaches this screen, but the
 * API narrows an employee's rows to the actions they performed, so what
 * differs by role is decided on the server — apart from where a row may
 * lead, which is decided here.
 */
export default function ActivityScreen() {
  const user = useCurrentUser()
  const [filter, setFilter] = useState<Filter>('all')
  const activity = useQuery(
    activityQueryOptions(
      filter === 'all' ? { pageSize: 100 } : { entityType: filter, pageSize: 100 },
    ),
  )

  if (!user) {
    return null
  }

  return (
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
      <View className="gap-1 py-4">
        <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Activity
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          {activity.data
            ? `${activity.data.total} ${activity.data.total === 1 ? 'event' : 'events'}`
            : 'What changed'}
        </Text>
      </View>

      <View className="pb-3">
        <ChipRow
          value={filter}
          options={[
            { value: 'all' as const, label: 'All' },
            ...ACTIVITY_ENTITY_TYPES.map((entity) => ({
              value: entity,
              label: toneLabel(entity),
            })),
          ]}
          onChange={setFilter}
        />
      </View>

      {activity.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : activity.isError ? (
        <Message
          title="Activity could not be loaded"
          body={describeError(activity.error)}
          onRetry={() => activity.refetch()}
        />
      ) : (
        <FlatList
          data={activity.data.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityRow item={item} to={destinationFor(item, user.role.name)} />
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            <Message
              title={filter === 'all' ? 'No activity yet' : 'Nothing here'}
              body={
                filter !== 'all'
                  ? 'Nothing matches this filter.'
                  : user.role.name === 'employee'
                    ? 'Your own actions appear here as you work.'
                    : 'Actions across the organisation appear here.'
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={activity.isRefetching}
              onRefresh={() => activity.refetch()}
            />
          }
        />
      )}
    </View>
  )
}

/**
 * Where a row leads, or `null` for the rows that lead nowhere. An employee
 * holds `activity:read` without `users:read` or `clients:read`, so they see
 * events about records they may not open; a deleted entity has no id left
 * to open; and departments are a single list on mobile, with no detail
 * screen to point at. Tasks and projects are row-scoped by the API, so an
 * unauthorised tap lands on that screen's error state rather than leaking.
 */
function destinationFor(item: ActivityListItem, role: RoleName): Href | null {
  const id = item.entityId

  if (id === null) {
    return null
  }

  switch (item.entityType) {
    case 'task':
      return { pathname: '/tasks/[taskId]', params: { taskId: id } }
    case 'project':
      return { pathname: '/projects/[projectId]', params: { projectId: id } }
    case 'client':
      return can(role, 'clients:read')
        ? { pathname: '/clients/[clientId]', params: { clientId: id } }
        : null
    case 'user':
      return can(role, 'users:read')
        ? { pathname: '/users/[userId]', params: { userId: id } }
        : null
    default:
      return null
  }
}

function ActivityRow({ item, to }: { item: ActivityListItem; to: Href | null }) {
  const card = (
    <View className="gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <Text
          className="flex-1 text-base font-medium text-neutral-900 dark:text-neutral-50"
          numberOfLines={1}
        >
          {item.actor?.name ?? 'System'}
        </Text>
        <Badge tone="neutral" label={toneLabel(item.action)} />
      </View>
      <Text className="text-sm text-neutral-700 dark:text-neutral-300" numberOfLines={2}>
        {item.description ?? toneLabel(item.action)}
      </Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatDateTime(item.createdAt)}
        </Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {toneLabel(item.entityType)}
        </Text>
      </View>
    </View>
  )

  if (!to) {
    return (
      <View className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        {card}
      </View>
    )
  }

  return (
    <Link href={to} asChild>
      <Pressable
        accessibilityRole="button"
        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 active:bg-neutral-50 dark:active:bg-neutral-800"
      >
        {card}
      </Pressable>
    </Link>
  )
}
