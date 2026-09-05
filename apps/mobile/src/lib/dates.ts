/** Date-only ISO string for lexicographic comparison with `@db.Date` values. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  return dueDate !== null && !completed && dueDate < utcToday()
}
