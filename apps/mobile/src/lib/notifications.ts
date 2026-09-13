import type { Paginated } from '@opsflow/types/api'
import type {
  NotificationListFilters,
  NotificationListItem,
  NotificationUnreadCount,
} from '@opsflow/types/notification'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { infiniteListOptions } from '@/lib/paged'
import { toSearchParams } from '@/lib/search-params'

/**
 * The page is `pageParam`'s to decide and the size is the server's default,
 * so neither belongs in the filters a screen passes — a `page` here would sit
 * in the query key while a different one went into the URL.
 */
type NotificationInfiniteFilters = Omit<NotificationListFilters, 'page' | 'pageSize'>

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters: NotificationListFilters) => ['notifications', 'list', filters] as const,
  infinite: (filters: NotificationInfiniteFilters) =>
    ['notifications', 'infinite', filters] as const,
  /** Every cached inbox, whichever read-state chip it was loaded under. */
  inbox: ['notifications', 'infinite'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

export const notificationsQueryOptions = (filters: NotificationListFilters) =>
  queryOptions({
    queryKey: notificationKeys.list(filters),
    queryFn: () =>
      apiFetch<Paginated<NotificationListItem>>(`/notifications${toSearchParams(filters)}`),
  })

/** The infinite form, for the list screen. One page per scroll to the end. */
export const notificationsInfiniteQueryOptions = (filters: NotificationInfiniteFilters = {}) =>
  infiniteListOptions<NotificationListItem>(
    notificationKeys.infinite(filters),
    '/notifications',
    filters,
  )

/**
 * Polled, because it drives the tab-bar badge and there is no realtime
 * channel. The query is shared by the tab bar, the dashboard and the inbox,
 * so one interval serves all three.
 */
export const unreadCountQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => apiFetch<NotificationUnreadCount>('/notifications/unread-count'),
    refetchInterval: 30_000,
  })

export function markNotificationRead(id: string) {
  return apiFetch<NotificationListItem>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return apiFetch<NotificationUnreadCount>('/notifications/read-all', { method: 'POST' })
}
