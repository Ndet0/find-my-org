import type { Paginated } from '@opsflow/types/api'
import type { ProjectDetail, ProjectListFilters, ProjectListItem } from '@opsflow/types/project'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toSearchParams } from '@/lib/search-params'

/**
 * The read side of the projects module. Mobile views projects (product
 * §33); creating, editing and staffing them stays on the web, so there are
 * no mutations here. The keys match the web client's layout.
 */
export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: ProjectListFilters) => ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
}

export const projectsQueryOptions = (filters: ProjectListFilters) =>
  queryOptions({
    queryKey: projectKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ProjectListItem>>(`/projects${toSearchParams(filters)}`),
  })

export const projectQueryOptions = (id: string) =>
  queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiFetch<ProjectDetail>(`/projects/${id}`),
  })
