import { fromBase64, toBase64 } from './base64'
import {
  DEFAULT_KDF,
  generateKeyPair,
  type KdfParams,
  type KeyPair,
  publicKeyOf,
  unwrapKeyPair,
  type WrappedKeyPair,
  wrapKeyPair,
} from './index'

/**
 * The life of a person's messaging identity on one device, with the I/O
 * injected so the web app, the phone and the tests share it. The device
 * keeps the secret key in its own storage; the server keeps the
 * password-wrapped backup and the public key.
 */

/** Where the device keeps the secret key: `localStorage`, SecureStore, or a test map. */
export type IdentityStore = {
  read(userId: string): Promise<string | null>
  write(userId: string, secretKey: string): Promise<void>
  remove(userId: string): Promise<void>
}

/**
 * `GET` and `PUT /api/dm/key`, as the client's API layer performs them.
 * Replacing an existing backup needs the account password alongside the
 * record, which is how the server tells its owner from a stolen session;
 * a first upload does not.
 */
export type IdentityRemote = {
  fetch(): Promise<WrappedKeyPair | null>
  save(record: WrappedKeyPair, password?: string): Promise<unknown>
}

/**
 * The secret key already on this device, if any. A value that does not
 * decode — a damaged or hand-edited entry — is dropped rather than thrown
 * on every render, so the person is asked for their password instead of
 * being stuck.
 */
export async function loadIdentity(userId: string, store: IdentityStore): Promise<KeyPair | null> {
  const stored = await store.read(userId)

  if (!stored) {
    return null
  }

  try {
    const secretKey = fromBase64(stored)

    if (secretKey.length !== 32) {
      throw new Error('Not a key')
    }

    return { secretKey, publicKey: publicKeyOf(secretKey) }
  } catch {
    await store.remove(userId).catch(() => undefined)
    return null
  }
}

/** One unlock per person at a time; sign-in and the Messages page can both ask. */
const inFlight = new Map<string, Promise<KeyPair>>()

/**
 * Makes this device able to read and write messages, given the password.
 * Runs on sign-in, and again from the Messages page for a session that was
 * already open when the feature arrived. Two calls for the same person at
 * once share one run, so they cannot generate two different keys.
 *
 * A secret already on the device is checked against the backup: if the
 * server holds a different public key — this device kept a key that lost a
 * first-upload race, or an account was reset — the backup wins and the local
 * copy is replaced. If the server holds nothing, this device's key is backed
 * up. The check is best effort: offline, the local key is trusted.
 *
 * With no local secret, a backup on the server is unwrapped with the
 * password and kept locally. No backup means this is the person's first
 * sign-in since messaging existed: a key pair is generated here, its wrapped
 * form is uploaded, and only then is the secret kept — so a device never
 * holds a key the server has no backup of. If the upload is refused because
 * another device got there first, that device's backup is unwrapped instead.
 */
export function unlockIdentity(input: {
  userId: string
  password: string
  store: IdentityStore
  remote: IdentityRemote
  kdf?: KdfParams
}): Promise<KeyPair> {
  const pending = inFlight.get(input.userId)

  if (pending) {
    return pending
  }

  const run = unlock(input).finally(() => {
    inFlight.delete(input.userId)
  })
  inFlight.set(input.userId, run)
  return run
}

async function unlock(input: {
  userId: string
  password: string
  store: IdentityStore
  remote: IdentityRemote
  kdf?: KdfParams
}): Promise<KeyPair> {
  const kdf = input.kdf ?? DEFAULT_KDF
  const existing = await loadIdentity(input.userId, input.store)

  if (existing) {
    return reconcile(existing, input, kdf)
  }

  const backup = await input.remote.fetch()

  if (backup) {
    return restore(backup, input)
  }

  const pair = generateKeyPair()

  try {
    await input.remote.save(await wrapKeyPair(pair, input.password, input.userId, kdf))
  } catch (error) {
    // Refused: most likely another sign-in registered a key meanwhile. Its
    // backup is the identity now; anything else is the original failure.
    const raced = await input.remote.fetch().catch(() => null)

    if (!raced) {
      throw error
    }

    return restore(raced, input)
  }

  await input.store.write(input.userId, toBase64(pair.secretKey))
  return pair
}

async function restore(
  backup: WrappedKeyPair,
  input: { userId: string; password: string; store: IdentityStore },
): Promise<KeyPair> {
  const pair = await unwrapKeyPair(backup, input.password, input.userId)
  await input.store.write(input.userId, toBase64(pair.secretKey))
  return pair
}

async function reconcile(
  local: KeyPair,
  input: { userId: string; password: string; store: IdentityStore; remote: IdentityRemote },
  kdf: KdfParams,
): Promise<KeyPair> {
  let backup: WrappedKeyPair | null

  try {
    backup = await input.remote.fetch()
  } catch {
    return local
  }

  if (!backup) {
    await input.remote
      .save(await wrapKeyPair(local, input.password, input.userId, kdf))
      .catch(() => undefined)
    return local
  }

  if (backup.publicKey === toBase64(local.publicKey)) {
    return local
  }

  const pair = await unwrapKeyPair(backup, input.password, input.userId)
  await input.store.write(input.userId, toBase64(pair.secretKey))
  return pair
}

/**
 * After a password change: the backup has to open with the new password, or
 * the next device cannot unlock it. The secret comes from this device, or
 * failing that from the backup under the old password. No backup at all
 * means there is nothing to re-wrap; sign-in will create one.
 *
 * The new password goes with the upload: it is the account password by the
 * time this runs, and the server asks for it before replacing a backup.
 */
export async function rewrapIdentity(input: {
  userId: string
  currentPassword: string
  newPassword: string
  store: IdentityStore
  remote: IdentityRemote
  kdf?: KdfParams
}): Promise<void> {
  let pair = await loadIdentity(input.userId, input.store)

  if (!pair) {
    const backup = await input.remote.fetch()

    if (!backup) {
      return
    }

    pair = await unwrapKeyPair(backup, input.currentPassword, input.userId)
    await input.store.write(input.userId, toBase64(pair.secretKey))
  }

  await input.remote.save(
    await wrapKeyPair(pair, input.newPassword, input.userId, input.kdf ?? DEFAULT_KDF),
    input.newPassword,
  )
}

/**
 * Seals this device's copy of the secret under the account password and
 * uploads it: the retry for a re-wrap that failed after a password change.
 * Only a device that holds the secret can do it; one that does not has to
 * unlock first, which needs the password the backup was sealed under.
 */
export async function refreshBackup(input: {
  userId: string
  password: string
  store: IdentityStore
  remote: IdentityRemote
  kdf?: KdfParams
}): Promise<boolean> {
  const pair = await loadIdentity(input.userId, input.store)

  if (!pair) {
    return false
  }

  await input.remote.save(
    await wrapKeyPair(pair, input.password, input.userId, input.kdf ?? DEFAULT_KDF),
    input.password,
  )
  return true
}
