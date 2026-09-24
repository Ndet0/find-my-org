import { describe, expect, test } from 'bun:test'
import {
  canDirectMessage,
  dmKeySchema,
  dmMessageListQuerySchema,
  mergeMessages,
  sendDmMessageSchema,
} from '../src/dm'

const ME = '01a057c2-6a1f-7512-84e4-a4205576ff78'
const OTHER = '01a057c2-6a1f-7512-84e4-a4205576ff79'

describe('canDirectMessage', () => {
  test('a manager may reach everyone, and everyone may reach a manager', () => {
    for (const role of ['admin', 'manager', 'employee'] as const) {
      expect(canDirectMessage({ id: ME, role: 'manager' }, { id: OTHER, role })).toBe(true)
      expect(canDirectMessage({ id: ME, role }, { id: OTHER, role: 'manager' })).toBe(true)
    }
  })

  test('an administrator and an employee may not reach each other', () => {
    expect(canDirectMessage({ id: ME, role: 'employee' }, { id: OTHER, role: 'admin' })).toBe(false)
    expect(canDirectMessage({ id: ME, role: 'admin' }, { id: OTHER, role: 'employee' })).toBe(false)
  })

  test('peers of the same role may, except a person with themselves', () => {
    expect(canDirectMessage({ id: ME, role: 'admin' }, { id: OTHER, role: 'admin' })).toBe(true)
    expect(canDirectMessage({ id: ME, role: 'employee' }, { id: OTHER, role: 'employee' })).toBe(
      true,
    )
    expect(canDirectMessage({ id: ME, role: 'manager' }, { id: ME, role: 'manager' })).toBe(false)
  })
})

const b64 = (bytes: number) =>
  'A'.repeat(Math.ceil(bytes / 3) * 4 - (bytes % 3 === 0 ? 0 : 3 - (bytes % 3))) +
  '='.repeat(bytes % 3 === 0 ? 0 : 3 - (bytes % 3))

describe('dmKeySchema', () => {
  const valid = {
    publicKey: b64(32),
    wrappedSecretKey: b64(48),
    wrapNonce: b64(24),
    kdfSalt: b64(16),
    kdf: { name: 'scrypt', n: 2 ** 15, r: 8, p: 1 },
    version: 1,
  }

  test('accepts a well-formed record', () => {
    expect(dmKeySchema.safeParse(valid).success).toBe(true)
  })

  test('refuses a key of the wrong length or a weak KDF', () => {
    expect(dmKeySchema.safeParse({ ...valid, publicKey: b64(16) }).success).toBe(false)
    expect(dmKeySchema.safeParse({ ...valid, kdf: { ...valid.kdf, n: 2 ** 10 } }).success).toBe(
      false,
    )
    expect(dmKeySchema.safeParse({ ...valid, version: 2 }).success).toBe(false)
  })

  test('refuses a scrypt cost that is not a power of two', () => {
    expect(dmKeySchema.safeParse({ ...valid, kdf: { ...valid.kdf, n: 2 ** 15 + 1 } }).success).toBe(
      false,
    )
  })

  test('refuses base64 whose padding does not match its length', () => {
    // 44 characters is the length of 32 bytes, but only with one "=" at the
    // end; without it the string would decode to 33 bytes.
    expect(dmKeySchema.safeParse({ ...valid, publicKey: 'A'.repeat(44) }).success).toBe(false)
    expect(dmKeySchema.safeParse({ ...valid, kdfSalt: `${'A'.repeat(20)}A===` }).success).toBe(
      false,
    )
  })

  test('carries the password only as an optional extra', () => {
    expect(dmKeySchema.parse(valid).currentPassword).toBeUndefined()
    expect(dmKeySchema.parse({ ...valid, currentPassword: 'pw' }).currentPassword).toBe('pw')
    expect(dmKeySchema.safeParse({ ...valid, currentPassword: '' }).success).toBe(false)
  })
})

describe('sendDmMessageSchema', () => {
  test('defaults the version and refuses non-base64', () => {
    const parsed = sendDmMessageSchema.parse({ ciphertext: b64(16), nonce: b64(24) })
    expect(parsed.version).toBe(1)
    expect(
      sendDmMessageSchema.safeParse({ ciphertext: 'not base64!', nonce: b64(24) }).success,
    ).toBe(false)
  })

  test('refuses a sealed message shorter than its tag, or with broken padding', () => {
    expect(sendDmMessageSchema.safeParse({ ciphertext: 'AAAAAAAA', nonce: b64(24) }).success).toBe(
      false,
    )
    expect(sendDmMessageSchema.safeParse({ ciphertext: b64(17), nonce: b64(24) }).success).toBe(
      true,
    )
    // Length not a multiple of four: `Buffer.from` would quietly drop bytes.
    expect(
      sendDmMessageSchema.safeParse({ ciphertext: `${b64(18)}A`, nonce: b64(24) }).success,
    ).toBe(false)
    expect(
      sendDmMessageSchema.safeParse({ ciphertext: `${'A'.repeat(22)}A=`, nonce: b64(24) }).success,
    ).toBe(true)
    expect(
      sendDmMessageSchema.safeParse({ ciphertext: `${'A'.repeat(21)}===`, nonce: b64(24) }).success,
    ).toBe(false)
  })
})

describe('dmMessageListQuerySchema', () => {
  test('defaults the page size and takes a UUID cursor', () => {
    expect(dmMessageListQuerySchema.parse({})).toEqual({ pageSize: 50 })
    expect(dmMessageListQuerySchema.parse({ before: ME }).before).toBe(ME)
    expect(dmMessageListQuerySchema.safeParse({ before: 'abc' }).success).toBe(false)
  })
})

describe('mergeMessages', () => {
  const message = (id: string) => ({
    id,
    conversationId: OTHER,
    senderId: ME,
    ciphertext: 'AAAA',
    nonce: 'AAAA',
    version: 1,
    createdAt: '2026-09-23T00:00:00.000Z',
  })

  test('orders by id, oldest first, and drops duplicates', () => {
    const merged = mergeMessages([message('c'), message('b')], [message('a'), message('b')])
    expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })
})
