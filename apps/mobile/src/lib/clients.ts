import type { Paginated } from '@opsflow/types/api'
import type {
  ClientDetail,
  ClientListFilters,
  ClientListItem,
  CreateClientInput,
  UpdateClientInput,
  UpdateClientStatusInput,
} from '@opsflow/types/client'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { infiniteListOptions } from '@/lib/paged'
import { toSearchParams } from '@/lib/search-params'

/**
 * The page is `pageParam`'s to decide and the size is the server's default,
 * so neither belongs in the filters a screen passes — a `page` here would sit
 * in the query key while a different one went into the URL.
 */
type ClientInfiniteFilters = Omit<ClientListFilters, 'page' | 'pageSize'>

/**
 * Clients need `clients:read`, which employees do not hold, so these
 * queries only ever run for administrators and managers. The keys match the web
 * client's layout, plus the `infinite` branch the list screen reads; both are
 * under the `['clients']` prefix that the mutations invalidate.
 */
export const clientKeys = {
  all: ['clients'] as const,
  list: (filters: ClientListFilters) => ['clients', 'list', filters] as const,
  infinite: (filters: ClientInfiniteFilters) => ['clients', 'infinite', filters] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
}

export const clientsQueryOptions = (filters: ClientListFilters) =>
  queryOptions({
    queryKey: clientKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ClientListItem>>(`/clients${toSearchParams(filters)}`),
  })

/** The infinite form, for the list screen. One page per scroll to the end. */
export const clientsInfiniteQueryOptions = (filters: ClientInfiniteFilters = {}) =>
  infiniteListOptions<ClientListItem>(clientKeys.infinite(filters), '/clients', filters)

export const clientQueryOptions = (id: string) =>
  queryOptions({
    queryKey: clientKeys.detail(id),
    queryFn: () => apiFetch<ClientDetail>(`/clients/${id}`),
  })

export function createClient(input: CreateClientInput) {
  return apiFetch<ClientDetail>('/clients', { method: 'POST', body: JSON.stringify(input) })
}

export function updateClient(id: string, input: UpdateClientInput) {
  return apiFetch<ClientDetail>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function updateClientStatus(id: string, input: UpdateClientStatusInput) {
  return apiFetch<ClientDetail>(`/clients/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
