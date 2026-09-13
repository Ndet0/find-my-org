import type { ActivityListFilters, ActivityListItem } from '@opsflow/types/activity'
import type { Paginated } from '@opsflow/types/api'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { infiniteListOptions } from '@/lib/paged'
import { toSearchParams } from '@/lib/search-params'

/**
 * The page is `pageParam`'s to decide and the size is the server's default,
 * so neither belongs in the filters a screen passes — a `page` here would sit
 * in the query key while a different one went into the URL.
 */
type ActivityInfiniteFilters = Omit<ActivityListFilters, 'page' | 'pageSize'>

/**
 * The activity trail. `activity:read` is held by all three roles, so this
 * runs for everyone — but the API scopes an employee's rows to the actions
 * they performed, so the feed narrows on the server rather than here. Read
 * only: there is no endpoint to write or clear a log.
 */
export const activityKeys = {
  all: ['activity'] as const,
  list: (filters: ActivityListFilters) => ['activity', 'list', filters] as const,
  infinite: (filters: ActivityInfiniteFilters) => ['activity', 'infinite', filters] as const,
}

export const activityQueryOptions = (filters: ActivityListFilters) =>
  queryOptions({
    queryKey: activityKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ActivityListItem>>(`/activity${toSearchParams(filters)}`),
  })

/** The infinite form, for the list screen. One page per scroll to the end. */
export const activityInfiniteQueryOptions = (filters: ActivityInfiniteFilters = {}) =>
  infiniteListOptions<ActivityListItem>(activityKeys.infinite(filters), '/activity', filters)
