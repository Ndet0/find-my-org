import type { ActivityListFilters, ActivityListItem } from '@opsflow/types/activity'
import type { Paginated } from '@opsflow/types/api'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const activityKeys = {
  all: ['activity'] as const,
  list: (filters: ActivityListFilters) => ['activity', 'list', filters] as const,
}

function toSearchParams(filters: ActivityListFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export const activityQueryOptions = (filters: ActivityListFilters) =>
  queryOptions({
    queryKey: activityKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ActivityListItem>>(`/activity${toSearchParams(filters)}`),
    placeholderData: (previous) => previous,
  })
