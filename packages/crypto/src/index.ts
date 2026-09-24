import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { fromBase64, toBase64 } from './base64'

export { fromBase64, isBase64, toBase64 } from './base64'

/**
 * The end-to-end encryption behind direct messages, in one place so the web
 * app, the phone and the tests run the same code. Nothing here touches the
 * network or storage: the clients fetch and keep the material, this module
 * only transforms it.
 *
 * The scheme, version 1:
 *
 * - Every person has one X25519 identity key pair, generated on their own
 *   device. The public half goes to the server; the secret half never does
 *   in the clear.
 * - The secret key is *wrapped* for backup: scrypt turns the login password
 *   and a random salt into a 256-bit key, which seals the secret with
 *   XChaCha20-Poly1305. The server stores the sealed blob so a second device
 *   can unlock it with the password. The server holds only a scrypt hash of
 *   that password for sign-in, so it cannot unwrap the blob itself.
 * - A conversation's key is HKDF-SHA256 over the X25519 shared secret of the
 *   two identity keys, so both sides compute the same key and nobody else can.
 * - Each message is sealed with that key under a fresh 24-byte nonce, with
 *   the conversation id and the sender id as associated data. The server can
 *   store and forward a message; it cannot read it, alter it, or replay it as
 *   the other party or into another conversation.
 *
 * Limitations, on purpose for the first version: one static key per
 * conversation rather than a ratchet, so there is no forward secrecy; and a
 * key exists per person, not per device, which is what makes the backup
 * necessary.
 */

export const DM_PROTOCOL_VERSION = 1

export const KEY_LENGTH = 32
export const NONCE_LENGTH = 24
export const SALT_LENGTH = 16

const INFO = 'opsflow-dm-v1'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type DmCryptoCode = 'NO_RANDOM_SOURCE' | 'WRONG_PASSWORD' | 'KEY_MISMATCH' | 'UNREADABLE'

/** A failure a client can act on, as opposed to a bug. */
export class DmCryptoError extends Error {
  constructor(
    readonly code: DmCryptoCode,
    message: string,
  ) {
    super(message)
    this.name = 'DmCryptoError'
  }
}

/**
 * Cryptographic randomness from the platform. Browsers and Bun provide it on
 * `globalThis.crypto`; React Native does not, and the mobile app installs
 * `expo-crypto`'s implementation there before anything else runs.
 */
export function randomBytes(length: number): Uint8Array {
  const source = globalThis.crypto

  if (!source || typeof source.getRandomValues !== 'function') {
    throw new DmCryptoError(
      'NO_RANDOM_SOURCE',
      'This device has no cryptographic random number source',
    )
  }

  return source.getRandomValues(new Uint8Array(length))
}

export type KeyPair = { secretKey: Uint8Array; publicKey: Uint8Array }

export function generateKeyPair(): KeyPair {
  const secretKey = randomBytes(KEY_LENGTH)
  return { secretKey, publicKey: x25519.getPublicKey(secretKey) }
}

export function publicKeyOf(secretKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(secretKey)
}

export type KdfParams = { name: 'scrypt'; n: number; r: number; p: number }

/**
 * 2^15 iterations, 8 blocks: about 32 MiB and a fraction of a second on a
 * laptop, one to two seconds in JavaScript on a phone. It runs once per
 * sign-in on a new device and once per password change, so that is fine; the
 * parameters travel with the record so they can be raised later.
 */
export const DEFAULT_KDF: KdfParams = { name: 'scrypt', n: 2 ** 15, r: 8, p: 1 }

/** The backup record, as it is stored and sent: every byte string in base64. */
export type WrappedKeyPair = {
  publicKey: string
  wrappedSecretKey: string
  wrapNonce: string
  kdfSalt: string
  kdf: KdfParams
  version: number
}

async function wrappingKey(
  password: string,
  salt: Uint8Array,
  kdf: KdfParams,
): Promise<Uint8Array> {
  return scryptAsync(encoder.encode(password.normalize('NFKC')), salt, {
    N: kdf.n,
    r: kdf.r,
    p: kdf.p,
    dkLen: KEY_LENGTH,
  })
}

/**
 * Seals the secret key under the password for the server to keep. The
 * user's id is bound as associated data, so a blob moved onto another
 * account's row cannot be unwrapped there even with the right password.
 */
export async function wrapKeyPair(
  pair: KeyPair,
  password: string,
  userId: string,
  kdf: KdfParams = DEFAULT_KDF,
): Promise<WrappedKeyPair> {
  const kdfSalt = randomBytes(SALT_LENGTH)
  const wrapNonce = randomBytes(NONCE_LENGTH)
  const key = await wrappingKey(password, kdfSalt, kdf)
  const sealed = xchacha20poly1305(key, wrapNonce, encoder.encode(userId)).encrypt(pair.secretKey)

  return {
    publicKey: toBase64(pair.publicKey),
    wrappedSecretKey: toBase64(sealed),
    wrapNonce: toBase64(wrapNonce),
    kdfSalt: toBase64(kdfSalt),
    kdf,
    version: DM_PROTOCOL_VERSION,
  }
}

/**
 * The reverse. A wrong password fails the authentication tag, which is the
 * only signal there is; a blob that opens but does not match the public key
 * on record is reported separately, because that is corruption or tampering
 * rather than a typo.
 */
export async function unwrapKeyPair(
  record: WrappedKeyPair,
  password: string,
  userId: string,
): Promise<KeyPair> {
  const key = await wrappingKey(password, fromBase64(record.kdfSalt), record.kdf)
  let secretKey: Uint8Array

  try {
    secretKey = xchacha20poly1305(
      key,
      fromBase64(record.wrapNonce),
      encoder.encode(userId),
    ).decrypt(fromBase64(record.wrappedSecretKey))
  } catch {
    throw new DmCryptoError('WRONG_PASSWORD', 'The password does not open this key')
  }

  const publicKey = x25519.getPublicKey(secretKey)

  if (toBase64(publicKey) !== record.publicKey) {
    throw new DmCryptoError('KEY_MISMATCH', 'The stored key does not match its public half')
  }

  return { secretKey, publicKey }
}

/**
 * The symmetric key both sides of a conversation derive. The two public keys
 * go into the HKDF info in a fixed order, so the key is bound to this pair of
 * identities and the same on both ends.
 */
export function deriveConversationKey(
  mySecretKey: Uint8Array,
  peerPublicKey: Uint8Array,
): Uint8Array {
  const myPublicKey = x25519.getPublicKey(mySecretKey)
  const shared = x25519.getSharedSecret(mySecretKey, peerPublicKey)
  const [first, second] = [toBase64(myPublicKey), toBase64(peerPublicKey)].sort()

  return hkdf(sha256, shared, undefined, encoder.encode(`${INFO}|${first}|${second}`), KEY_LENGTH)
}

/** What a sealed message binds to: moving it anywhere else fails to open. */
export function messageAad(conversationId: string, senderId: string): string {
  return `${INFO}|${conversationId}|${senderId}`
}

export type SealedMessage = { ciphertext: string; nonce: string }

export function sealMessage(key: Uint8Array, plaintext: string, aad: string): SealedMessage {
  const nonce = randomBytes(NONCE_LENGTH)
  const ciphertext = xchacha20poly1305(key, nonce, encoder.encode(aad)).encrypt(
    encoder.encode(plaintext),
  )

  return { ciphertext: toBase64(ciphertext), nonce: toBase64(nonce) }
}

export function openMessage(key: Uint8Array, sealed: SealedMessage, aad: string): string {
  try {
    const plaintext = xchacha20poly1305(key, fromBase64(sealed.nonce), encoder.encode(aad)).decrypt(
      fromBase64(sealed.ciphertext),
    )
    return decoder.decode(plaintext)
  } catch {
    throw new DmCryptoError('UNREADABLE', 'This message could not be decrypted')
  }
}
