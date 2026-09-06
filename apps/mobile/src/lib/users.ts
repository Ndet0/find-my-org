import type { Paginated } from '@opsflow/types/api'
import type { UserListFilters, UserListItem } from '@opsflow/types/user'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toSearchParams } from '@/lib/search-params'

/**
 * The people directory, read-only on mobile: it feeds the manager and
 * member pickers on the project screens. Creating and administering users
 * stays on the web. `users:read` is held by administrators and managers,
 * which is exactly who can reach those pickers.
 */
export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserListFilters) => ['users', 'list', filters] as const,
}

export const usersQueryOptions = (filters: UserListFilters) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => apiFetch<Paginated<UserListItem>>(`/users${toSearchParams(filters)}`),
    staleTime: 5 * 60 * 1000,
  })
