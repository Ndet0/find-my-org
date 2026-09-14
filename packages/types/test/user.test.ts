import { describe, expect, test } from 'bun:test'
import { PASSWORD_MIN_LENGTH } from '../src/auth'
import { createUserSchema, updateProfileSchema, userListQuerySchema } from '../src/user'

describe('userListQuerySchema', () => {
  test('role and status accept only their enums', () => {
    expect(userListQuerySchema.safeParse({ role: 'manager' }).success).toBe(true)
    expect(userListQuerySchema.safeParse({ role: 'root' }).success).toBe(false)
    expect(userListQuerySchema.safeParse({ status: 'suspended' }).success).toBe(true)
    expect(userListQuerySchema.safeParse({ status: 'banned' }).success).toBe(false)
  })
})

describe('createUserSchema', () => {
  const valid = { name: 'Ada', email: 'Ada@Example.com', role: 'employee' as const }

  test('uses the shared password policy', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1)
    const exact = 'a'.repeat(PASSWORD_MIN_LENGTH)
    expect(createUserSchema.safeParse({ ...valid, password: short }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...valid, password: exact }).success).toBe(true)
  })

  test('lowercases the email to match how Better Auth stores it', () => {
    expect(
      createUserSchema.parse({ ...valid, password: 'a'.repeat(PASSWORD_MIN_LENGTH) }).email,
    ).toBe('ada@example.com')
  })
})

describe('updateProfileSchema', () => {
  test('carries only name and phone, and refuses an empty body', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false)
    expect(updateProfileSchema.parse({ phone: '' }).phone).toBeNull()
    // Position is the organisation's to set, so a profile edit strips it.
    expect(updateProfileSchema.parse({ name: 'Ada', position: 'CTO' })).toEqual({ name: 'Ada' })
  })
})
