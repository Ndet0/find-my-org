import { describe, expect, test } from 'bun:test'
import { formatDateTime, isOverdue, isProjectOverdue, utcToday } from './dates'

/** A date-only string `days` from today, so the tests move with the clock. */
function daysFromToday(days: number): string {
  const [year, month, day] = utcToday().split('-').map(Number)
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days))
    .toISOString()
    .slice(0, 10)
}

describe('isOverdue', () => {
  test('is past the due date, not on it', () => {
    expect(isOverdue(daysFromToday(-1), false)).toBe(true)
    expect(isOverdue(daysFromToday(0), false)).toBe(false)
    expect(isOverdue(daysFromToday(1), false)).toBe(false)
  })

  test('needs a due date and open work', () => {
    expect(isOverdue(null, false)).toBe(false)
    expect(isOverdue(daysFromToday(-1), true)).toBe(false)
  })
})

describe('isProjectOverdue', () => {
  test('counts open statuses only, as the dashboard does', () => {
    const yesterday = daysFromToday(-1)
    expect(isProjectOverdue(yesterday, 'active')).toBe(true)
    expect(isProjectOverdue(yesterday, 'delayed')).toBe(true)
    expect(isProjectOverdue(yesterday, 'on_hold')).toBe(true)
    expect(isProjectOverdue(yesterday, 'completed')).toBe(false)
    expect(isProjectOverdue(yesterday, 'cancelled')).toBe(false)
  })
})

describe('formatDateTime', () => {
  test('renders the year and the minute in the device locale', () => {
    const text = formatDateTime('2026-09-05T14:20:00.000Z')
    expect(text).toContain('2026')
    expect(text).toMatch(/\d{2}/)
  })
})
