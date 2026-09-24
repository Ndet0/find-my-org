import {
  deriveConversationKey,
  fromBase64,
  type KeyPair,
  messageAad,
  openMessage,
  toBase64,
} from '@opsflow/crypto'
import type {
  CreateDmConversationInput,
  DmContact,
  DmConversationItem,
  DmKeyInput,
  DmKeyRecord,
  DmMessageItem,
  DmMessagePage,
  DmUnreadCount,
  SendDmMessageInput,
} from '@opsflow/types/dm'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/**
 * The Messages module's queries — the mobile twin of
 * `apps/web/src/lib/dm.ts`, with the same keys and the same polling
 * cadence. The API relays ciphertext; every message is opened on the phone
 * with the key the `MessagingGate` holds.
 */
export const dmKeys = {
  all: ['dm'] as const,
  contacts: (q: string) => ['dm', 'contacts', q] as const,
  conversations: ['dm', 'conversations'] as const,
  conversation: (id: string) => ['dm', 'conversation', id] as const,
  latestMessages: (id: string) => ['dm', 'messages', id] as const,
  unreadCount: ['dm', 'unread-count'] as const,
}

export function fetchOwnKey(): Promise<DmKeyRecord | null> {
  return apiFetch<DmKeyRecord | null>('/dm/key')
}

export function saveOwnKey(record: DmKeyInput): Promise<DmKeyRecord> {
  return apiFetch<DmKeyRecord>('/dm/key', { method: 'PUT', body: JSON.stringify(record) })
}

export const contactsQueryOptions = (q: string) =>
  queryOptions({
    queryKey: dmKeys.contacts(q),
    queryFn: () => apiFetch<DmContact[]>(`/dm/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: (previous) => previous,
  })

export const conversationsQueryOptions = () =>
  queryOptions({
    queryKey: dmKeys.conversations,
    queryFn: () => apiFetch<DmConversationItem[]>('/dm/conversations'),
    refetchInterval: 10_000,
  })

export const conversationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: dmKeys.conversation(id),
    queryFn: () => apiFetch<DmConversationItem>(`/dm/conversations/${id}`),
    // The peer's status and key can change under an open thread — an
    // account deactivated, a colleague who has just set up messaging.
    refetchInterval: 30_000,
  })

/** The newest page of a thread, polled. Older pages come through `fetchOlderMessages`. */
export const latestMessagesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: dmKeys.latestMessages(id),
    queryFn: () => apiFetch<DmMessagePage>(`/dm/conversations/${id}/messages`),
    refetchInterval: 4_000,
  })

export function fetchOlderMessages(id: string, before: string): Promise<DmMessagePage> {
  return apiFetch<DmMessagePage>(`/dm/conversations/${id}/messages?before=${before}`)
}

export const dmUnreadCountQueryOptions = () =>
  queryOptions({
    queryKey: dmKeys.unreadCount,
    queryFn: () => apiFetch<DmUnreadCount>('/dm/unread-count'),
    refetchInterval: 30_000,
  })

export function openConversation(input: CreateDmConversationInput): Promise<DmConversationItem> {
  return apiFetch<DmConversationItem>('/dm/conversations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function sendMessage(conversationId: string, input: SendDmMessageInput) {
  return apiFetch<DmMessageItem>(`/dm/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function markConversationRead(conversationId: string): Promise<DmUnreadCount> {
  return apiFetch<DmUnreadCount>(`/dm/conversations/${conversationId}/read`, { method: 'POST' })
}

// ---------------------------------------------------------------------------
// Opening messages

/** A message with its text, or `null` where the text could not be recovered. */
export type OpenedMessage = DmMessageItem & { text: string | null }

/**
 * The key for one thread: cheap, but derived once per pair all the same.
 * Keyed by both identities, not the peer alone — a different person signing
 * in on this device after a session expired must not inherit the previous
 * person's keys, and would otherwise read nothing and seal to the wrong key.
 */
const conversationKeys = new Map<string, Uint8Array>()

export function conversationKeyFor(identity: KeyPair, peerPublicKey: string): Uint8Array {
  const cacheKey = `${toBase64(identity.publicKey)}|${peerPublicKey}`
  let key = conversationKeys.get(cacheKey)

  if (!key) {
    key = deriveConversationKey(identity.secretKey, fromBase64(peerPublicKey))
    conversationKeys.set(cacheKey, key)
  }

  return key
}

/**
 * Opened once per message id under a given key. A thread is polled and
 * re-rendered often, and the ciphertext of a stored message never changes,
 * so the second look is free. Held per key object — the one
 * `conversationKeyFor` returns — so a message that failed to open under the
 * wrong key is tried again under the right one, and forgetting the keys
 * forgets the texts.
 */
let opened = new WeakMap<Uint8Array, Map<string, string | null>>()

export function openMessages(key: Uint8Array, messages: DmMessageItem[]): OpenedMessage[] {
  let texts = opened.get(key)

  if (!texts) {
    texts = new Map()
    opened.set(key, texts)
  }

  return messages.map((message) => {
    let text = texts.get(message.id)

    if (text === undefined) {
      try {
        text = openMessage(key, message, messageAad(message.conversationId, message.senderId))
      } catch {
        text = null
      }
      texts.set(message.id, text)
    }

    return { ...message, text }
  })
}

/** Forgets every key and every opened message: for sign-out, and for a session that ended. */
export function forgetOpenedMessages(): void {
  conversationKeys.clear()
  opened = new WeakMap()
}
