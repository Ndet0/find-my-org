import type { Paginated } from '@opsflow/types/api'
import type {
  CreateTaskInput,
  TaskDetail,
  TaskListFilters,
  TaskListItem,
  UpdateTaskInput,
  UpdateTaskPriorityInput,
  UpdateTaskStatusInput,
} from '@opsflow/types/task'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/**
 * Query keys are namespaced per module and carry their filters, so a later
 * mutation can invalidate every tasks list with `['tasks']` without
 * disturbing anything else in the cache.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  list: (filters: TaskListFilters) => ['tasks', 'list', filters] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
}

function toSearchParams(filters: TaskListFilters): string {
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

export const tasksQueryOptions = (filters: TaskListFilters) =>
  queryOptions({
    queryKey: taskKeys.list(filters),
    queryFn: () => apiFetch<Paginated<TaskListItem>>(`/tasks${toSearchParams(filters)}`),
    // Paging and filtering feel broken if the table blanks out between
    // pages, so the previous result stays on screen while the next loads.
    placeholderData: (previous) => previous,
  })

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: taskKeys.detail(id),
    queryFn: () => apiFetch<TaskDetail>(`/tasks/${id}`),
  })

export function createTask(input: CreateTaskInput) {
  return apiFetch<TaskDetail>('/tasks', { method: 'POST', body: JSON.stringify(input) })
}

export function updateTask(id: string, input: UpdateTaskInput) {
  return apiFetch<TaskDetail>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateTaskStatus(id: string, input: UpdateTaskStatusInput) {
  return apiFetch<TaskDetail>(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateTaskPriority(id: string, input: UpdateTaskPriorityInput) {
  return apiFetch<TaskDetail>(`/tasks/${id}/priority`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteTask(id: string) {
  return apiFetch<TaskDetail>(`/tasks/${id}`, { method: 'DELETE' })
}
