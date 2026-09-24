import { describe, expect, test } from 'bun:test'
import {
  DmCryptoError,
  deriveConversationKey,
  fromBase64,
  generateKeyPair,
  isBase64,
  messageAad,
  openMessage,
  publicKeyOf,
  sealMessage,
  toBase64,
  unwrapKeyPair,
  wrapKeyPair,
} from '../src/index'

/** Small parameters: the tests exercise the scheme, not the cost. */
const FAST_KDF = { name: 'scrypt' as const, n: 2 ** 10, r: 8, p: 1 }
const ALICE = '01a057c2-6a1f-7512-84e4-a4205576ff78'
const BOB = '01a057c2-6a1f-7512-84e4-a4205576ff79'
const CONVERSATION = '01a057c2-6a1f-7512-84e4-a4205576ff80'

describe('base64', () => {
  test.each([0, 1, 2, 3, 4, 31, 32, 33, 100])('round-trips %i bytes', (length) => {
    const bytes = new Uint8Array(length).map((_, i) => (i * 37 + 11) % 256)
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })

  test('agrees with the standard encoding', () => {
    expect(toBase64(new TextEncoder().encode('OPSflow'))).toBe('T1BTZmxvdw==')
    expect(new TextDecoder().decode(fromBase64('T1BTZmxvdw=='))).toBe('OPSflow')
  })

  test('rejects anything that is not padded base64', () => {
    expect(isBase64('abc')).toBe(false)
    expect(isBase64('ab-d')).toBe(false)
    expect(() => fromBase64('abc')).toThrow('Not base64')
  })
})

describe('identity keys', () => {
  test('a generated pair is 32 bytes each and the public half derives from the secret', () => {
    const pair = generateKeyPair()
    expect(pair.secretKey).toHaveLength(32)
    expect(pair.publicKey).toHaveLength(32)
    expect(publicKeyOf(pair.secretKey)).toEqual(pair.publicKey)
  })

  test('wrapping and unwrapping with the password gives the pair back', async () => {
    const pair = generateKeyPair()
    const record = await wrapKeyPair(pair, 'correct horse', ALICE, FAST_KDF)

    expect(record.publicKey).toBe(toBase64(pair.publicKey))
    expect(record.version).toBe(1)

    const unwrapped = await unwrapKeyPair(record, 'correct horse', ALICE)
    expect(unwrapped.secretKey).toEqual(pair.secretKey)
    expect(unwrapped.publicKey).toEqual(pair.publicKey)
  })

  test('a wrong password is reported as such', async () => {
    const record = await wrapKeyPair(generateKeyPair(), 'correct horse', ALICE, FAST_KDF)
    const thrown = await unwrapKeyPair(record, 'wrong horse', ALICE).catch((error) => error)

    expect(thrown).toBeInstanceOf(DmCryptoError)
    expect((thrown as DmCryptoError).code).toBe('WRONG_PASSWORD')
  })

  test('the blob is bound to the account it was made for', async () => {
    const record = await wrapKeyPair(generateKeyPair(), 'correct horse', ALICE, FAST_KDF)
    const thrown = await unwrapKeyPair(record, 'correct horse', BOB).catch((error) => error)

    expect((thrown as DmCryptoError).code).toBe('WRONG_PASSWORD')
  })

  test('a blob whose public key was swapped is refused', async () => {
    const record = await wrapKeyPair(generateKeyPair(), 'correct horse', ALICE, FAST_KDF)
    const tampered = { ...record, publicKey: toBase64(generateKeyPair().publicKey) }
    const thrown = await unwrapKeyPair(tampered, 'correct horse', ALICE).catch((error) => error)

    expect((thrown as DmCryptoError).code).toBe('KEY_MISMATCH')
  })
})

describe('messages', () => {
  const alice = generateKeyPair()
  const bob = generateKeyPair()
  const eve = generateKeyPair()

  test('both sides derive the same conversation key and nobody else does', () => {
    const fromAlice = deriveConversationKey(alice.secretKey, bob.publicKey)
    const fromBob = deriveConversationKey(bob.secretKey, alice.publicKey)
    const fromEve = deriveConversationKey(eve.secretKey, alice.publicKey)

    expect(fromAlice).toEqual(fromBob)
    expect(fromAlice).not.toEqual(fromEve)
  })

  test('a sealed message opens on the other side', () => {
    const key = deriveConversationKey(alice.secretKey, bob.publicKey)
    const aad = messageAad(CONVERSATION, ALICE)
    const sealed = sealMessage(key, 'Lunch at noon? 🍜', aad)

    expect(sealed.ciphertext).not.toContain('Lunch')
    expect(openMessage(deriveConversationKey(bob.secretKey, alice.publicKey), sealed, aad)).toBe(
      'Lunch at noon? 🍜',
    )
  })

  test('two seals of the same text differ', () => {
    const key = deriveConversationKey(alice.secretKey, bob.publicKey)
    const aad = messageAad(CONVERSATION, ALICE)
    expect(sealMessage(key, 'same', aad).ciphertext).not.toBe(
      sealMessage(key, 'same', aad).ciphertext,
    )
  })

  test('a message replayed as the other sender or in another conversation does not open', () => {
    const key = deriveConversationKey(alice.secretKey, bob.publicKey)
    const sealed = sealMessage(key, 'hello', messageAad(CONVERSATION, ALICE))

    for (const aad of [messageAad(CONVERSATION, BOB), messageAad(BOB, ALICE)]) {
      const thrown = (() => {
        try {
          openMessage(key, sealed, aad)
          return null
        } catch (error) {
          return error
        }
      })()
      expect((thrown as DmCryptoError).code).toBe('UNREADABLE')
    }
  })

  test('a tampered ciphertext does not open', () => {
    const key = deriveConversationKey(alice.secretKey, bob.publicKey)
    const aad = messageAad(CONVERSATION, ALICE)
    const sealed = sealMessage(key, 'hello', aad)
    const bytes = fromBase64(sealed.ciphertext)
    bytes[0] = (bytes[0] as number) ^ 1

    expect(() => openMessage(key, { ...sealed, ciphertext: toBase64(bytes) }, aad)).toThrow(
      DmCryptoError,
    )
  })
})
