import type { Paginated } from '@opsflow/types/api'
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserDetail,
  UserListFilters,
  UserListItem,
} from '@opsflow/types/user'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { infiniteListOptions } from '@/lib/paged'
import { toSearchParams } from '@/lib/search-params'

/**
 * The page is `pageParam`'s to decide and the size is the server's default,
 * so neither belongs in the filters a screen passes — a `page` here would sit
 * in the query key while a different one went into the URL.
 */
type UserInfiniteFilters = Omit<UserListFilters, 'page' | 'pageSize'>

/**
 * The people directory. `users:read` is held by administrators and managers,
 * so these queries never run for an employee; `users:write` is the
 * administrator's alone, which is why the mutations below are reachable from
 * fewer screens than the reads. The keys match the web client's, so the
 * invalidation rules carry over unchanged; the `infinite` branch the directory
 * screen reads is mobile's own, and sits under the same `['users']` prefix.
 *
 * These queries also back the manager and member pickers on the project
 * screens, which is all they did before the directory existed.
 */
export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserListFilters) => ['users', 'list', filters] as const,
  infinite: (filters: UserInfiniteFilters) => ['users', 'infinite', filters] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
}

export const usersQueryOptions = (filters: UserListFilters) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => apiFetch<Paginated<UserListItem>>(`/users${toSearchParams(filters)}`),
  })

/** The infinite form, for the list screen. One page per scroll to the end. */
export const usersInfiniteQueryOptions = (filters: UserInfiniteFilters = {}) =>
  infiniteListOptions<UserListItem>(userKeys.infinite(filters), '/users', filters)

export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: () => apiFetch<UserDetail>(`/users/${id}`),
  })

export function createUser(input: CreateUserInput) {
  return apiFetch<UserDetail>('/users', { method: 'POST', body: JSON.stringify(input) })
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiFetch<UserDetail>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function updateUserStatus(id: string, input: UpdateUserStatusInput) {
  return apiFetch<UserDetail>(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
