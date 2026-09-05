import type { Paginated } from '@opsflow/types/api'
import type {
  NotificationListFilters,
  NotificationListItem,
  NotificationUnreadCount,
} from '@opsflow/types/notification'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toSearchParams } from '@/lib/search-params'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters: NotificationListFilters) => ['notifications', 'list', filters] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

export const notificationsQueryOptions = (filters: NotificationListFilters) =>
  queryOptions({
    queryKey: notificationKeys.list(filters),
    queryFn: () =>
      apiFetch<Paginated<NotificationListItem>>(`/notifications${toSearchParams(filters)}`),
  })

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
