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

/**
 * Query keys are namespaced per module and carry their filters, so a later
 * mutation can invalidate every projects list with `['projects']` without
 * disturbing anything else in the cache.
 */
export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: ProjectListFilters) => ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
}

function toSearchParams(filters: ProjectListFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    // An absent filter must not be sent as the string "undefined".
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value))
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export const projectsQueryOptions = (filters: ProjectListFilters) =>
  queryOptions({
    queryKey: projectKeys.list(filters),
    queryFn: () => apiFetch<Paginated<ProjectListItem>>(`/projects${toSearchParams(filters)}`),
    // Paging and filtering feel broken if the table blanks out between
    // pages, so the previous result stays on screen while the next loads.
    placeholderData: (previous) => previous,
  })

export const projectQueryOptions = (id: string) =>
  queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiFetch<ProjectDetail>(`/projects/${id}`),
  })

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
