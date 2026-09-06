import type { Paginated } from '@opsflow/types/api'
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  ProjectDetail,
  ProjectListFilters,
  ProjectListItem,
  UpdateProjectInput,
  UpdateProjectPriorityInput,
  UpdateProjectStatusInput,
} from '@opsflow/types/project'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toSearchParams } from '@/lib/search-params'

/** The keys match the web client's layout. */
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

/*
 * Mutations, one per API route, as in `apps/web/src/lib/projects.ts`.
 * Every write returns the full project, so callers can seed the detail
 * cache with the response and invalidate the lists.
 */

export function createProject(input: CreateProjectInput) {
  return apiFetch<ProjectDetail>('/projects', { method: 'POST', body: JSON.stringify(input) })
}

export function updateProject(id: string, input: UpdateProjectInput) {
  return apiFetch<ProjectDetail>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateProjectStatus(id: string, input: UpdateProjectStatusInput) {
  return apiFetch<ProjectDetail>(`/projects/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateProjectPriority(id: string, input: UpdateProjectPriorityInput) {
  return apiFetch<ProjectDetail>(`/projects/${id}/priority`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function addProjectMember(id: string, input: AddProjectMemberInput) {
  return apiFetch<ProjectDetail>(`/projects/${id}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function removeProjectMember(id: string, userId: string) {
  return apiFetch<ProjectDetail>(`/projects/${id}/members/${userId}`, { method: 'DELETE' })
}
