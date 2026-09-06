import type {
  CreateDepartmentInput,
  DepartmentListItem,
  UpdateDepartmentInput,
} from '@opsflow/types/department'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const departmentKeys = {
  all: ['departments'] as const,
  list: ['departments', 'list'] as const,
}

export const departmentsQueryOptions = queryOptions({
  queryKey: departmentKeys.list,
  queryFn: () => apiFetch<DepartmentListItem[]>('/departments'),
  // Reference data: a handful of rows that change when someone edits the org chart.
  staleTime: 10 * 60 * 1000,
})

export function createDepartment(input: CreateDepartmentInput) {
  return apiFetch<DepartmentListItem>('/departments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateDepartment(id: string, input: UpdateDepartmentInput) {
  return apiFetch<DepartmentListItem>(`/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteDepartment(id: string) {
  return apiFetch<DepartmentListItem>(`/departments/${id}`, { method: 'DELETE' })
}
