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
import { infiniteListOptions } from '@/lib/paged'
import { toSearchParams } from '@/lib/search-params'

/**
 * The page is `pageParam`'s to decide and the size is the server's default,
 * so neither belongs in the filters a screen passes — a `page` here would sit
 * in the query key while a different one went into the URL.
 */
type TaskInfiniteFilters = Omit<TaskListFilters, 'page' | 'pageSize'>

/**
 * The same key layout as the web client, plus an `infinite` branch the web has
 * no use for: its table jumps to a page, this list appends one. Both sit under
 * the `['tasks']` prefix, so every `invalidateQueries({ queryKey: taskKeys.all })`
 * reaches them without knowing which is mounted.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  list: (filters: TaskListFilters) => ['tasks', 'list', filters] as const,
  infinite: (filters: TaskInfiniteFilters) => ['tasks', 'infinite', filters] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
}

export const tasksQueryOptions = (filters: TaskListFilters) =>
  queryOptions({
    queryKey: taskKeys.list(filters),
    queryFn: () => apiFetch<Paginated<TaskListItem>>(`/tasks${toSearchParams(filters)}`),
  })

/** The infinite form, for the list screen. One page per scroll to the end. */
export const tasksInfiniteQueryOptions = (filters: TaskInfiniteFilters = {}) =>
  infiniteListOptions<TaskListItem>(taskKeys.infinite(filters), '/tasks', filters)

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: taskKeys.detail(id),
    queryFn: () => apiFetch<TaskDetail>(`/tasks/${id}`),
  })

/*
 * The write side mirrors `apps/web/src/lib/tasks.ts` call for call. The
 * API applies the same permission and row-scoping rules regardless of the
 * client, so nothing here decides who may do what; the screens hide controls
 * with `can()` as a courtesy and the server answers for real.
 */

export function createTask(input: CreateTaskInput) {
  return apiFetch<TaskDetail>('/tasks', { method: 'POST', body: JSON.stringify(input) })
}

export function updateTask(id: string, input: UpdateTaskInput) {
  return apiFetch<TaskDetail>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
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
