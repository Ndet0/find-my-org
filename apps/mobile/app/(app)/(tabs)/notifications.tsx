import type { NotificationListItem } from '@opsflow/types/notification'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { describeError, Message } from '@/components/message'
import { Screen } from '@/components/screen'
import { useCurrentUser } from '@/lib/current-user'
import { formatDateTime } from '@/lib/dates'
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationsQueryOptions,
  unreadCountQueryOptions,
} from '@/lib/notifications'

/**
 * The caller's notifications, newest first; the API scopes them to the
 * session so there is nothing to filter here beyond read state. Tapping an
 * unread row marks it read, which is the one write this screen makes.
 */
export default function NotificationsScreen() {
  const user = useCurrentUser()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const notifications = useQuery(notificationsQueryOptions({ unread: unreadOnly, pageSize: 100 }))
  const unread = useQuery(unreadCountQueryOptions())

  // No per-mutation invalidation: the query client already refreshes every
  // notifications query after any successful mutation, and a second
  // invalidation here would cancel that refetch and start it again.
  const markOne = useMutation({ mutationFn: markNotificationRead })
  const markAll = useMutation({ mutationFn: markAllNotificationsRead })

  if (!user) {
    return null
  }

  const unreadCount = unread.data?.count ?? 0

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3 py-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold text-neutral-900">Inbox</Text>
          <Text className="text-sm text-neutral-500">
            {unread.data
              ? unreadCount === 0
                ? 'You are all caught up'
                : `${unreadCount} unread`
              : 'Notifications about your work'}
          </Text>
        </View>
        <Button
          title={markAll.isPending ? 'Marking…' : 'Mark all read'}
          variant="outline"
          size="sm"
          disabled={markAll.isPending || unreadCount === 0}
          onPress={() => markAll.mutate()}
        />
      </View>

      <View className="mb-3 flex-row gap-2">
        <FilterChip label="All" active={!unreadOnly} onPress={() => setUnreadOnly(false)} />
        <FilterChip label="Unread" active={unreadOnly} onPress={() => setUnreadOnly(true)} />
      </View>

      {markAll.isError || markOne.isError ? (
        <Text className="mb-3 text-sm text-red-600">
          {describeError(markAll.error ?? markOne.error)}
        </Text>
      ) : null}

      {notifications.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : notifications.isError ? (
        <Message
          title="Notifications could not be loaded"
          body={describeError(notifications.error)}
          onRetry={() => notifications.refetch()}
        />
      ) : (
        <FlatList
          data={notifications.data.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              marking={markOne.isPending && markOne.variables === item.id}
              onPress={() => markOne.mutate(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            <Message
              title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}
              body={
                unreadOnly
                  ? 'Everything has been read.'
                  : 'Assignments and project updates will appear here.'
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={notifications.isRefetching}
              onRefresh={() => notifications.refetch()}
            />
          }
        />
      )}
    </Screen>
  )
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${active ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white active:bg-neutral-100'}`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-neutral-700'}`}>
        {label}
      </Text>
    </Pressable>
  )
}

function NotificationRow({
  item,
  marking,
  onPress,
}: {
  item: NotificationListItem
  marking: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={item.isRead ? undefined : 'Marks this notification as read'}
      disabled={marking}
      onPress={item.isRead ? undefined : onPress}
      className={`gap-1 rounded-xl border p-4 ${item.isRead ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-300 bg-white active:bg-neutral-50'}`}
    >
      <View className="flex-row items-start gap-2">
        {item.isRead ? null : <View className="mt-1.5 h-2 w-2 rounded-full bg-blue-600" />}
        <Text
          className={`flex-1 text-base ${item.isRead ? 'text-neutral-700' : 'font-semibold text-neutral-900'}`}
        >
          {item.title}
        </Text>
      </View>
      <Text className="text-sm text-neutral-600">{item.message}</Text>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs capitalize text-neutral-500">
          {item.type} · {formatDateTime(item.createdAt)}
        </Text>
        {marking ? (
          <Text className="text-xs text-neutral-400">Marking…</Text>
        ) : item.isRead ? null : (
          <Text className="text-xs text-neutral-400">Tap to mark read</Text>
        )}
      </View>
    </Pressable>
  )
}
