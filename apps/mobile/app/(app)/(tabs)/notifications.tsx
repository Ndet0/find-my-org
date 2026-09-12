import type { NotificationListItem } from '@opsflow/types/notification'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ErrorText } from '@/components/error-text'
import { FilterChip } from '@/components/filter-chip'
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
          <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Inbox
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
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
        <ErrorText className="mb-3">{describeError(markAll.error ?? markOne.error)}</ErrorText>
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
      className={`gap-1 rounded-xl border p-4 ${item.isRead ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 active:bg-neutral-50 dark:active:bg-neutral-800'}`}
    >
      <View className="flex-row items-start gap-2">
        {item.isRead ? null : (
          <View className="mt-1.5 h-2 w-2 rounded-full bg-tone-info-foreground dark:bg-tone-info-dark-foreground" />
        )}
        <Text
          className={`flex-1 text-base ${item.isRead ? 'text-neutral-700 dark:text-neutral-300' : 'font-semibold text-neutral-900 dark:text-neutral-50'}`}
        >
          {item.title}
        </Text>
      </View>
      <Text className="text-sm text-neutral-600 dark:text-neutral-400">{item.message}</Text>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
          {item.type} · {formatDateTime(item.createdAt)}
        </Text>
        {marking ? (
          <Text className="text-xs text-neutral-400 dark:text-neutral-500">Marking…</Text>
        ) : item.isRead ? null : (
          <Text className="text-xs text-neutral-400 dark:text-neutral-500">Tap to mark read</Text>
        )}
      </View>
    </Pressable>
  )
}
