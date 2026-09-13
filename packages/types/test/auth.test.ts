import { describe, expect, test } from 'bun:test'
import {
  changePasswordSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  password,
  signInSchema,
} from '../src/auth'

describe('signInSchema', () => {
  test('requires an address and that a password was typed', () => {
    expect(signInSchema.safeParse({ email: 'nope', password: 'secret' }).success).toBe(false)
    expect(signInSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false)
  })

  test('does not enforce the length policy on sign-in', () => {
    // A password that predates the policy must still open the account, and
    // the sign-in form must not reveal what the policy is.
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1)
    expect(signInSchema.safeParse({ email: 'a@b.co', password: short }).success).toBe(true)
  })
})

describe('the password policy', () => {
  // Built from the constants so the test moves with them: raising the
  // minimum before production must not need a test edit.
  test('accepts exactly the minimum and the maximum length', () => {
    expect(password.safeParse('a'.repeat(PASSWORD_MIN_LENGTH)).success).toBe(true)
    expect(password.safeParse('a'.repeat(PASSWORD_MAX_LENGTH)).success).toBe(true)
  })

  test('refuses one character either side', () => {
    expect(password.safeParse('a'.repeat(PASSWORD_MIN_LENGTH - 1)).success).toBe(false)
    expect(password.safeParse('a'.repeat(PASSWORD_MAX_LENGTH + 1)).success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  const current = 'old-password'
  const fresh = 'new-password'

  test('a well-formed change passes', () => {
    const body = { currentPassword: current, newPassword: fresh, confirmPassword: fresh }
    expect(changePasswordSchema.safeParse(body).success).toBe(true)
  })

  test('reusing the current password is reported on the new-password field', () => {
    const body = { currentPassword: current, newPassword: current, confirmPassword: current }
    const result = changePasswordSchema.safeParse(body)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['newPassword']])
  })

  test('a mismatched confirmation is reported on the confirmation field', () => {
    const body = { currentPassword: current, newPassword: fresh, confirmPassword: 'typo' }
    const result = changePasswordSchema.safeParse(body)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['confirmPassword']])
  })

  test('both refinements report when both are broken', () => {
    const body = { currentPassword: current, newPassword: current, confirmPassword: 'typo' }
    const result = changePasswordSchema.safeParse(body)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['newPassword'],
      ['confirmPassword'],
    ])
  })

  test('a too-short new password fails on its field and the refinements stay quiet', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1)
    const body = { currentPassword: current, newPassword: short, confirmPassword: short }
    const result = changePasswordSchema.safeParse(body)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['newPassword']])
  })

  test('the current password must be typed', () => {
    const body = { currentPassword: '', newPassword: fresh, confirmPassword: fresh }
    expect(changePasswordSchema.safeParse(body).success).toBe(false)
  })
})
