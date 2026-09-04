/**
 * Midnight UTC of the current date. `@db.Date` columns hold date-only
 * values, so "overdue" comparisons must use a date-only boundary — comparing
 * against `new Date()` would shift the cutoff by the time of day.
 */
export function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}
