import '../../test/setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { generateKeyPair, toBase64, unwrapKeyPair, type WrappedKeyPair } from '@opsflow/crypto'
import { fail, mockApi, ok } from '../../test/api-mock'
import {
  forgetMessagingSecrets,
  markBackupStale,
  refreshMessagingBackup,
  rewrapMessaging,
  unlockMessaging,
} from './dm-identity'

/**
 * The browser side of the key lifecycle: where the secret lands, what goes
 * to the API, and what sign-out leaves behind. The scheme itself is tested
 * in `@opsflow/crypto`; this checks the wiring. Real key derivation runs,
 * at the default cost, so the file is slower than its neighbours.
 */

const USER = '01a057c2-6a1f-7512-84e4-a4205576ff78'
const STORED = `opsflow.dm.secret.${USER}`
const isStale = () => localStorage.getItem(`opsflow.dm.backup-stale.${USER}`) === '1'

let api: ReturnType<typeof mockApi> | undefined

afterEach(() => {
  api?.restore()
  localStorage.clear()
})

describe('unlockMessaging', () => {
  test('with no backup, generates a key, uploads the wrapped form and keeps the secret', async () => {
    let uploaded: WrappedKeyPair | null = null
    api = mockApi({
      'GET /api/dm/key': ok(null),
      'PUT /api/dm/key': ({ body }) => {
        uploaded = body as WrappedKeyPair
        return ok({ ...(body as object), updatedAt: '2026-09-23T00:00:00.000Z' })
      },
    })

    const pair = await unlockMessaging(USER, 'opsflow-dev-password')

    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'GET /api/dm/key',
      'PUT /api/dm/key',
    ])
    expect(uploaded).not.toBeNull()
    expect((uploaded as unknown as WrappedKeyPair).publicKey).toBe(toBase64(pair.publicKey))
    expect(localStorage.getItem(STORED)).toBe(toBase64(pair.secretKey))

    // A first upload carries no password: there is nothing to replace yet.
    expect('currentPassword' in (uploaded as unknown as object)).toBe(false)

    // The upload opens with the password and nothing else.
    const record = uploaded as unknown as WrappedKeyPair
    expect((await unwrapKeyPair(record, 'opsflow-dev-password', USER)).secretKey).toEqual(
      pair.secretKey,
    )
    await expect(unwrapKeyPair(record, 'other', USER)).rejects.toThrow()
  })

  test('a browser that already holds the secret only checks it against the backup', async () => {
    const local = generateKeyPair()
    api = mockApi({
      'GET /api/dm/key': ok({ publicKey: toBase64(local.publicKey) }),
    })
    localStorage.setItem(STORED, toBase64(local.secretKey))

    const pair = await unlockMessaging(USER, 'whatever')
    expect(pair.secretKey).toEqual(local.secretKey)
    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual(['GET /api/dm/key'])
  })

  test('a browser that already holds the secret keeps it when the API is unreachable', async () => {
    const local = generateKeyPair()
    api = mockApi({ 'GET /api/dm/key': fail('INTERNAL', 'down', 500) })
    localStorage.setItem(STORED, toBase64(local.secretKey))

    const pair = await unlockMessaging(USER, 'whatever')
    expect(pair.secretKey).toEqual(local.secretKey)
  })
})

describe('rewrapMessaging, the stale mark and sign-out', () => {
  test('re-uploads the same public key under the new password, with the password, and sign-out forgets the secret', async () => {
    const uploads: (WrappedKeyPair & { currentPassword?: string })[] = []
    api = mockApi({
      'GET /api/dm/key': ok(null),
      'PUT /api/dm/key': ({ body }) => {
        uploads.push(body as WrappedKeyPair)
        return ok(body)
      },
    })

    const pair = await unlockMessaging(USER, 'old password')
    await rewrapMessaging(USER, 'old password', 'new password')

    expect(uploads).toHaveLength(2)
    expect(uploads[1]?.publicKey).toBe(uploads[0]?.publicKey)
    expect(uploads[1]?.currentPassword).toBe('new password')
    expect(
      (await unwrapKeyPair(uploads[1] as WrappedKeyPair, 'new password', USER)).secretKey,
    ).toEqual(pair.secretKey)

    forgetMessagingSecrets()
    expect(localStorage.getItem(STORED)).toBeNull()
  })

  test('a failed re-wrap is remembered until the backup is refreshed', async () => {
    const uploads: (WrappedKeyPair & { currentPassword?: string })[] = []
    api = mockApi({
      'GET /api/dm/key': ok(null),
      'PUT /api/dm/key': ({ body }) => {
        uploads.push(body as WrappedKeyPair)
        return ok(body)
      },
    })
    await unlockMessaging(USER, 'old password')

    markBackupStale(USER)
    expect(isStale()).toBe(true)

    // Sign-out drops the secret but not the mark: the backup is still stale.
    forgetMessagingSecrets()
    expect(isStale()).toBe(true)
    expect(await refreshMessagingBackup(USER, 'new password')).toBe(false)

    await unlockMessaging(USER, 'old password')
    expect(await refreshMessagingBackup(USER, 'new password')).toBe(true)
    expect(uploads.at(-1)?.currentPassword).toBe('new password')
    expect(isStale()).toBe(false)
  })
})
