import '../../test/setup'
import { describe, expect, test } from 'bun:test'
import { generateKeyPair, type KeyPair, messageAad, sealMessage, toBase64 } from '@opsflow/crypto'
import type { DmMessageItem } from '@opsflow/types/dm'
import { conversationKeyFor, forgetOpenedMessages, openMessages } from './dm'

/**
 * The caches around opening messages. They exist so a polled thread does
 * not re-derive and re-decrypt on every render, and the failure they must
 * not have is remembering across people: after a session ends and someone
 * else signs in on the same tab, nothing derived for the first person may
 * be handed to the second.
 */

const CONVERSATION = '01a057c2-6a1f-7512-84e4-a4205576ff78'

function sealed(id: string, from: KeyPair, to: KeyPair, text: string): DmMessageItem {
  const key = conversationKeyFor(from, toBase64(to.publicKey))
  return {
    id,
    conversationId: CONVERSATION,
    senderId: 'sender',
    version: 1,
    createdAt: '2026-09-23T00:00:00.000Z',
    ...sealMessage(key, text, messageAad(CONVERSATION, 'sender')),
  }
}

describe('conversationKeyFor', () => {
  test('is the same key from either side, and cached per pair', () => {
    const a = generateKeyPair()
    const b = generateKeyPair()

    const fromA = conversationKeyFor(a, toBase64(b.publicKey))
    const fromB = conversationKeyFor(b, toBase64(a.publicKey))
    expect(fromA).toEqual(fromB)
    expect(conversationKeyFor(a, toBase64(b.publicKey))).toBe(fromA)
  })

  test('two identities talking to the same peer get different keys', () => {
    const peer = generateKeyPair()
    const first = generateKeyPair()
    const second = generateKeyPair()

    const one = conversationKeyFor(first, toBase64(peer.publicKey))
    const two = conversationKeyFor(second, toBase64(peer.publicKey))
    expect(one).not.toEqual(two)
  })
})

describe('openMessages', () => {
  test('opens under the right key, and a message that failed under one key opens under another', () => {
    const peer = generateKeyPair()
    const first = generateKeyPair()
    const second = generateKeyPair()
    const message = sealed('m1', peer, second, 'for the second person')

    const wrongKey = conversationKeyFor(first, toBase64(peer.publicKey))
    expect(openMessages(wrongKey, [message])[0]?.text).toBeNull()

    const rightKey = conversationKeyFor(second, toBase64(peer.publicKey))
    expect(openMessages(rightKey, [message])[0]?.text).toBe('for the second person')
  })

  test('forgetting the keys forgets the texts', () => {
    const peer = generateKeyPair()
    const me = generateKeyPair()
    const message = sealed('m2', peer, me, 'hello')

    const key = conversationKeyFor(me, toBase64(peer.publicKey))
    expect(openMessages(key, [message])[0]?.text).toBe('hello')

    forgetOpenedMessages()
    const again = conversationKeyFor(me, toBase64(peer.publicKey))
    expect(again).not.toBe(key)
    expect(openMessages(again, [message])[0]?.text).toBe('hello')
  })
})
