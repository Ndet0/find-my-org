import { describe, expect, test } from 'bun:test'
import {
  type IdentityRemote,
  type IdentityStore,
  loadIdentity,
  refreshBackup,
  rewrapIdentity,
  unlockIdentity,
} from '../src/identity'
import {
  DmCryptoError,
  generateKeyPair,
  toBase64,
  unwrapKeyPair,
  type WrappedKeyPair,
  wrapKeyPair,
} from '../src/index'

const FAST_KDF = { name: 'scrypt' as const, n: 2 ** 10, r: 8, p: 1 }
const USER = '01a057c2-6a1f-7512-84e4-a4205576ff78'

function memoryStore(): IdentityStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    read: async (id) => map.get(id) ?? null,
    write: async (id, value) => void map.set(id, value),
    remove: async (id) => void map.delete(id),
  }
}

/**
 * The server's rules in miniature: a first upload is kept, a re-upload of
 * the same public key needs the password, and a different public key is
 * refused — as `putOwnKey` in the API does.
 */
function fakeServer(): IdentityRemote & {
  record: WrappedKeyPair | null
  saves: number
  passwords: (string | undefined)[]
} {
  const server = {
    record: null as WrappedKeyPair | null,
    saves: 0,
    passwords: [] as (string | undefined)[],
    fetch: async () => server.record,
    save: async (record: WrappedKeyPair, password?: string) => {
      if (server.record && server.record.publicKey !== record.publicKey) {
        throw new Error('DM_KEY_EXISTS')
      }
      server.record = record
      server.saves += 1
      server.passwords.push(password)
    },
  }
  return server
}

describe('unlockIdentity', () => {
  test('first sign-in generates a pair, backs it up, and keeps the secret', async () => {
    const store = memoryStore()
    const server = fakeServer()
    const pair = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store,
      remote: server,
      kdf: FAST_KDF,
    })

    expect(server.saves).toBe(1)
    expect(server.passwords).toEqual([undefined])
    expect(server.record?.publicKey).toBe(toBase64(pair.publicKey))
    expect(store.map.get(USER)).toBe(toBase64(pair.secretKey))
  })

  test('a second device restores the same pair from the backup', async () => {
    const server = fakeServer()
    const first = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store: memoryStore(),
      remote: server,
      kdf: FAST_KDF,
    })
    const second = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store: memoryStore(),
      remote: server,
      kdf: FAST_KDF,
    })

    expect(second.secretKey).toEqual(first.secretKey)
    expect(server.saves).toBe(1)
  })

  test('a device that already has the secret does not need the server', async () => {
    const store = memoryStore()
    const server = fakeServer()
    const pair = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store,
      remote: server,
      kdf: FAST_KDF,
    })

    const broken: IdentityRemote = {
      fetch: async () => {
        throw new Error('offline')
      },
      save: async () => {
        throw new Error('offline')
      },
    }
    const again = await unlockIdentity({ userId: USER, password: 'other', store, remote: broken })
    expect(again.secretKey).toEqual(pair.secretKey)
    expect(await loadIdentity(USER, store)).not.toBeNull()
  })

  test('a wrong password on a new device leaves nothing behind', async () => {
    const server = fakeServer()
    await unlockIdentity({
      userId: USER,
      password: 'pw',
      store: memoryStore(),
      remote: server,
      kdf: FAST_KDF,
    })

    const store = memoryStore()
    const thrown = await unlockIdentity({
      userId: USER,
      password: 'nope',
      store,
      remote: server,
    }).catch((error) => error)
    expect((thrown as DmCryptoError).code).toBe('WRONG_PASSWORD')
    expect(store.map.size).toBe(0)
  })

  test('two unlocks at once share one run and one key', async () => {
    const store = memoryStore()
    const server = fakeServer()
    const input = { userId: USER, password: 'pw', store, remote: server, kdf: FAST_KDF }

    const [a, b] = await Promise.all([unlockIdentity(input), unlockIdentity(input)])

    expect(a.secretKey).toEqual(b.secretKey)
    expect(server.saves).toBe(1)
  })

  test('a device whose upload lost the race takes the winning backup instead', async () => {
    const store = memoryStore()
    const server = fakeServer()
    let winner: WrappedKeyPair | null = null

    // The other device registers between this one's fetch and its save.
    const racy: IdentityRemote = {
      fetch: async () => server.record,
      save: async (record, password) => {
        if (!server.record) {
          winner = await wrapKeyPair(generateKeyPair(), 'pw', USER, FAST_KDF)
          server.record = winner
        }
        return server.save(record, password)
      },
    }

    const pair = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store,
      remote: racy,
      kdf: FAST_KDF,
    })

    expect(toBase64(pair.publicKey)).toBe((winner as unknown as WrappedKeyPair).publicKey)
    expect(store.map.get(USER)).toBe(toBase64(pair.secretKey))
  })

  test('a local secret that does not match the backup is replaced by it', async () => {
    const server = fakeServer()
    const real = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store: memoryStore(),
      remote: server,
      kdf: FAST_KDF,
    })

    const store = memoryStore()
    store.map.set(USER, toBase64(generateKeyPair().secretKey))

    const pair = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store,
      remote: server,
      kdf: FAST_KDF,
    })
    expect(pair.secretKey).toEqual(real.secretKey)
    expect(store.map.get(USER)).toBe(toBase64(real.secretKey))
  })

  test('a local secret with no backup on the server is backed up', async () => {
    const store = memoryStore()
    const server = fakeServer()
    const local = generateKeyPair()
    store.map.set(USER, toBase64(local.secretKey))

    const pair = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store,
      remote: server,
      kdf: FAST_KDF,
    })
    expect(pair.secretKey).toEqual(local.secretKey)
    expect(server.record?.publicKey).toBe(toBase64(local.publicKey))
    expect((await unwrapKeyPair(server.record as WrappedKeyPair, 'pw', USER)).secretKey).toEqual(
      local.secretKey,
    )
  })

  test('a damaged local entry is dropped and the backup used', async () => {
    const server = fakeServer()
    const real = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store: memoryStore(),
      remote: server,
      kdf: FAST_KDF,
    })

    const store = memoryStore()
    store.map.set(USER, 'not base64!')
    expect(await loadIdentity(USER, store)).toBeNull()
    expect(store.map.size).toBe(0)

    store.map.set(USER, 'AAAA')
    const pair = await unlockIdentity({
      userId: USER,
      password: 'pw',
      store,
      remote: server,
      kdf: FAST_KDF,
    })
    expect(pair.secretKey).toEqual(real.secretKey)
  })
})

describe('rewrapIdentity', () => {
  test('the backup opens with the new password, the key is unchanged, and the new password goes with the upload', async () => {
    const store = memoryStore()
    const server = fakeServer()
    const pair = await unlockIdentity({
      userId: USER,
      password: 'old',
      store,
      remote: server,
      kdf: FAST_KDF,
    })

    await rewrapIdentity({
      userId: USER,
      currentPassword: 'old',
      newPassword: 'new',
      store,
      remote: server,
      kdf: FAST_KDF,
    })

    const record = server.record as WrappedKeyPair
    expect((await unwrapKeyPair(record, 'new', USER)).secretKey).toEqual(pair.secretKey)
    await expect(unwrapKeyPair(record, 'old', USER)).rejects.toThrow(DmCryptoError)
    expect(server.passwords).toEqual([undefined, 'new'])
  })

  test('falls back to the backup under the old password when the device has no secret', async () => {
    const server = fakeServer()
    await unlockIdentity({
      userId: USER,
      password: 'old',
      store: memoryStore(),
      remote: server,
      kdf: FAST_KDF,
    })

    const fresh = memoryStore()
    await rewrapIdentity({
      userId: USER,
      currentPassword: 'old',
      newPassword: 'new',
      store: fresh,
      remote: server,
      kdf: FAST_KDF,
    })
    expect(fresh.map.size).toBe(1)
    expect(server.saves).toBe(2)
  })

  test('does nothing when there is no backup yet', async () => {
    const server = fakeServer()
    await rewrapIdentity({
      userId: USER,
      currentPassword: 'old',
      newPassword: 'new',
      store: memoryStore(),
      remote: server,
    })
    expect(server.saves).toBe(0)
  })
})

describe('refreshBackup', () => {
  test('re-seals the local secret under the given password', async () => {
    const store = memoryStore()
    const server = fakeServer()
    const pair = await unlockIdentity({
      userId: USER,
      password: 'old',
      store,
      remote: server,
      kdf: FAST_KDF,
    })

    expect(
      await refreshBackup({ userId: USER, password: 'new', store, remote: server, kdf: FAST_KDF }),
    ).toBe(true)
    expect(server.passwords.at(-1)).toBe('new')
    expect((await unwrapKeyPair(server.record as WrappedKeyPair, 'new', USER)).secretKey).toEqual(
      pair.secretKey,
    )
  })

  test('cannot run on a device without the secret', async () => {
    const server = fakeServer()
    expect(
      await refreshBackup({ userId: USER, password: 'new', store: memoryStore(), remote: server }),
    ).toBe(false)
    expect(server.saves).toBe(0)
  })
})
