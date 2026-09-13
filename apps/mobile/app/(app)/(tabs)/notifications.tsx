import type { Paginated } from '@opsflow/types/api'
import type { NotificationListItem } from '@opsflow/types/notification'
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ErrorText } from '@/components/error-text'
import { FilterChip } from '@/components/filter-chip'
import { ListFooter } from '@/components/list-footer'
import { describeError, Message } from '@/components/message'
import { Screen } from '@/components/screen'
import { useCurrentUser } from '@/lib/current-user'
import { formatDateTime } from '@/lib/dates'
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  notificationsInfiniteQueryOptions,
  unreadCountQueryOptions,
} from '@/lib/notifications'
import { flattenPages, loadMore } from '@/lib/paged'

/**
 * The caller's notifications, newest first; the API scopes them to the
 * session so there is nothing to filter here beyond read state. Tapping an
 * unread row marks it read, which is the one write this screen makes.
 *
 * The list is loaded a page at a time, and it is the one infinite list that
 * keeps itself fresh differently. The query client only marks it stale after a
 * write (see `query-client.ts`), because refetching it re-requests every loaded
 * page. It is refetched here instead, when the tab comes into focus — once per
 * visit, however many writes happened while the reader was elsewhere.
 */
export default function NotificationsScreen() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const notifications = useInfiniteQuery(notificationsInfiniteQueryOptions({ unread: unreadOnly }))
  const items = flattenPages(notifications.data)
  const unread = useQuery(unreadCountQueryOptions())

  // Staleness is read when focus arrives, not subscribed to. A callback that
  // depended on `isStale` would run again whenever it flipped — thirty seconds
  // after every load while the reader sat on the tab, and straight after every
  // tap, since a write marks the inbox stale. `type: 'active'` keeps it to the
  // chip on screen, and a query still on its first load is left to finish.
  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries({
        queryKey: notificationKeys.inbox,
        type: 'active',
        stale: true,
        predicate: (query) => query.state.data !== undefined && query.state.fetchStatus === 'idle',
      })
    }, [queryClient]),
  )

  // Marking one read patches the row where it sits instead of refetching the
  // inbox, which would re-request every loaded page to change one flag.
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (updated) => markReadInCache(queryClient, updated),
  })
  // Rare, and it changes every row, so a refetch is the honest answer here.
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.inbox }),
  })

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
      ) : notifications.isError && items.length === 0 ? (
        <Message
          title="Notifications could not be loaded"
          body={describeError(notifications.error)}
          onRetry={() => notifications.refetch()}
        />
      ) : (
        <FlatList
          data={items}
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
          onEndReached={loadMore(notifications)}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            <ListFooter
              loading={notifications.isFetchingNextPage}
              failed={notifications.isFetchNextPageError}
            />
          }
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

type InboxData = InfiniteData<Paginated<NotificationListItem>>

/**
 * Writes one read notification into every cached inbox. Under the All chip the
 * row is replaced with the server's copy, now read; under Unread it is removed,
 * or a row the reader has just read would sit on in a list of unread ones. Both
 * chips are patched, not only the one on screen, so switching chips does not
 * show the old state.
 *
 * A page left one row short is harmless: the next page is found from `page` and
 * `totalPages`, not from how many rows a page holds.
 *
 * `setQueryData` also clears the stale mark the query client set a moment
 * earlier, and that mark may have been standing for a different write — one
 * that raised a notification this list has not seen. So the inbox is marked
 * stale again, without a refetch, for the next focus to settle.
 */
function markReadInCache(queryClient: QueryClient, updated: NotificationListItem) {
  for (const [queryKey, data] of queryClient.getQueriesData<InboxData>({
    queryKey: notificationKeys.inbox,
  })) {
    if (!data) {
      continue
    }

    const filters = queryKey[2] as { unread?: boolean | 'true' } | undefined
    const unreadOnly = filters?.unread === true || filters?.unread === 'true'

    queryClient.setQueryData<InboxData>(queryKey, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: unreadOnly
          ? page.items.filter((item) => item.id !== updated.id)
          : page.items.map((item) => (item.id === updated.id ? updated : item)),
      })),
    })
  }

  void queryClient.invalidateQueries({ queryKey: notificationKeys.inbox, refetchType: 'none' })
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
