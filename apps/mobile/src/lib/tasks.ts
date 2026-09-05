import type { Paginated } from '@opsflow/types/api'
import type {
  TaskDetail,
  TaskListFilters,
  TaskListItem,
  UpdateTaskStatusInput,
} from '@opsflow/types/task'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Same key layout as the web client, so the two stay comparable. */
export const taskKeys = {
  all: ['tasks'] as const,
  list: (filters: TaskListFilters) => ['tasks', 'list', filters] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
}

function toSearchParams(filters: TaskListFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
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
  })

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: taskKeys.detail(id),
    queryFn: () => apiFetch<TaskDetail>(`/tasks/${id}`),
  })

export function updateTaskStatus(id: string, input: UpdateTaskStatusInput) {
  return apiFetch<TaskDetail>(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
