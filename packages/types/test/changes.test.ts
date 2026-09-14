import { describe, expect, test } from 'bun:test'
import { changedFields, hasChanges } from '../src/changes'

describe('changedFields', () => {
  const previous: {
    name: string
    role: string
    departmentId: string | null
    joinedAt: string | null
  } = {
    name: 'Ada',
    role: 'admin',
    departmentId: null,
    joinedAt: '2026-01-01',
  }

  test('keeps only the keys whose value differs', () => {
    expect(changedFields({ ...previous, name: 'Ada L.' }, previous)).toEqual({ name: 'Ada L.' })
  })

  test('an unchanged form is an empty patch', () => {
    const changes = changedFields({ ...previous }, previous)
    expect(changes).toEqual({})
    expect(hasChanges(changes)).toBe(false)
  })

  test('clearing a value to null is a change; null against null is not', () => {
    expect(changedFields({ ...previous, joinedAt: null }, previous)).toEqual({ joinedAt: null })
    expect(changedFields({ ...previous, departmentId: null }, previous)).toEqual({})
  })

  test('a role sent back unchanged is not a role change', () => {
    expect(changedFields({ ...previous, role: 'admin' }, previous)).not.toHaveProperty('role')
    expect(changedFields({ ...previous, role: 'manager' }, previous)).toEqual({ role: 'manager' })
  })
})
