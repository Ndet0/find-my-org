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

/**
 * Query keys are namespaced per module and carry their filters, so a later
 * mutation can invalidate every users list with `['users']` without
 * disturbing anything else in the cache.
 */
export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserListFilters) => ['users', 'list', filters] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
}

function toSearchParams(filters: UserListFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    // An absent filter must not be sent as the string "undefined".
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export const usersQueryOptions = (filters: UserListFilters) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => apiFetch<Paginated<UserListItem>>(`/users${toSearchParams(filters)}`),
    // Paging and filtering feel broken if the table blanks out between
    // pages, so the previous result stays on screen while the next loads.
    placeholderData: (previous) => previous,
  })

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
