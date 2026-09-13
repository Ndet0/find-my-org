import { describe, expect, test } from 'bun:test'
import { createClientSchema, updateClientSchema, updateClientStatusSchema } from '../src/client'

describe('createClientSchema', () => {
  const valid = { name: 'Acme' }

  test('a cleared email becomes null, a typed one is normalised', () => {
    expect(createClientSchema.parse({ ...valid, email: '' }).email).toBeNull()
    expect(createClientSchema.parse({ ...valid, email: null }).email).toBeNull()
    expect(createClientSchema.parse(valid).email).toBeUndefined()
    expect(createClientSchema.parse({ ...valid, email: '  Foo@Example.COM ' }).email).toBe(
      'foo@example.com',
    )
  })

  test('a malformed or oversized email is refused on its field', () => {
    const bad = createClientSchema.safeParse({ ...valid, email: 'nope' })
    expect(bad.error?.issues.map((issue) => issue.path)).toEqual([['email']])
    const long = createClientSchema.safeParse({ ...valid, email: `${'a'.repeat(251)}@x.co` })
    expect(long.error?.issues[0]?.message).toBe('An email must be 255 characters or fewer')
  })

  test('optional text clears to null and the name is trimmed and bounded', () => {
    expect(createClientSchema.parse({ ...valid, company: '' }).company).toBeNull()
    expect(createClientSchema.parse({ name: ' Acme ' }).name).toBe('Acme')
    expect(createClientSchema.safeParse({ name: 'a'.repeat(151) }).success).toBe(false)
    expect(createClientSchema.safeParse({ name: '  ' }).success).toBe(false)
  })
})

describe('the client PATCH bodies', () => {
  test('an empty update is refused', () => {
    expect(updateClientSchema.safeParse({}).success).toBe(false)
    expect(updateClientSchema.safeParse({ notes: 'call back Monday' }).success).toBe(true)
  })

  test('status accepts only its enum', () => {
    expect(updateClientStatusSchema.safeParse({ status: 'archived' }).success).toBe(true)
    expect(updateClientStatusSchema.safeParse({ status: 'deleted' }).success).toBe(false)
  })
})
