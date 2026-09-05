import type { ProjectStatus } from '@opsflow/types/project'

/** Date-only ISO string for lexicographic comparison with `@db.Date` values. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  return dueDate !== null && !completed && dueDate < utcToday()
}

/** The dashboard's definition: past the deadline and neither completed nor cancelled. */
export function isProjectOverdue(deadline: string | null, status: ProjectStatus): boolean {
  return isOverdue(deadline, status === 'completed' || status === 'cancelled')
}

/** A timestamp in the device's locale, e.g. "5 Sep 2026, 14:20". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
