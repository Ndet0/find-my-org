import type { ActivityListFilters, ActivityListItem } from '@opsflow/types/activity'
import type { Paginated } from '@opsflow/types/api'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toSearchParams } from '@/lib/search-params'

/**
 * The activity trail. `activity:read` is held by all three roles, so this
 * runs for everyone — but the API scopes an employee's rows to the actions
 * they performed, so the feed narrows on the server rather than here. Read
 * only: there is no endpoint to write or clear a log.
 */
export const activityKeys = {
  all: ['activity'] as const,
  list: (filters: ActivityListFilters) => ['activity', 'list', filters] as const,
}

export const activityQueryOptions = (filters: ActivityListFilters) =>
  queryOptions({
    queryKey: activityKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ActivityListItem>>(`/activity${toSearchParams(filters)}`),
  })
