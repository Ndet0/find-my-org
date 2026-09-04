import type { Paginated } from '@opsflow/types/api'
import type {
  NotificationListFilters,
  NotificationListItem,
  NotificationUnreadCount,
} from '@opsflow/types/notification'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters: NotificationListFilters) => ['notifications', 'list', filters] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

function toSearchParams(filters: NotificationListFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value))
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export const notificationsQueryOptions = (filters: NotificationListFilters) =>
  queryOptions({
    queryKey: notificationKeys.list(filters),
    queryFn: () =>
      apiFetch<Paginated<NotificationListItem>>(`/notifications${toSearchParams(filters)}`),
    placeholderData: (previous) => previous,
  })

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
