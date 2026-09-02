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

/**
 * Query keys are namespaced per module and carry their filters, so a later
 * mutation can invalidate every clients list with `['clients']` without
 * disturbing anything else in the cache.
 */
export const clientKeys = {
  all: ['clients'] as const,
  list: (filters: ClientListFilters) => ['clients', 'list', filters] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
}

function toSearchParams(filters: ClientListFilters): string {
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

export const clientsQueryOptions = (filters: ClientListFilters) =>
  queryOptions({
    queryKey: clientKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ClientListItem>>(`/clients${toSearchParams(filters)}`),
    // Paging and filtering feel broken if the table blanks out between
    // pages, so the previous result stays on screen while the next loads.
    placeholderData: (previous) => previous,
  })

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
