import { z } from 'zod'
import { MAX_PAGE_SIZE } from './api'
import type { RoleName } from './permissions'
import type { NamedRef, UserStatus } from './user'

/**
 * Direct messages: one-to-one, end-to-end encrypted. The API stores and
 * forwards ciphertext and never holds a key that opens it; the scheme lives
 * in `@opsflow/crypto`, and this module is the wire contract around it.
 */

/** Plaintext ceiling, enforced by the clients before sealing. */
export const DM_BODY_MAX = 5000

/**
 * Ceiling on a sealed message as sent: 5 000 characters can be 20 000 bytes
 * of UTF-8, plus a 16-byte tag, in base64. The API cannot see the text, so
 * this is the bound it enforces instead.
 */
export const DM_CIPHERTEXT_MAX = 28_000

export const DM_MESSAGE_PAGE_SIZE = 50

/**
 * Who may message whom. Everyone may reach a manager, and a manager may
 * reach everyone; an administrator and an employee may not reach each other
 * in either direction, so the only way to an administrator's inbox is
 * through a manager. Nobody messages themselves.
 *
 * Shared by the API, which refuses a conversation that breaks it, and by
 * the clients, which leave those people out of the picker.
 */
export function canDirectMessage(
  actor: { id: string; role: RoleName },
  peer: { id: string; role: RoleName },
): boolean {
  if (actor.id === peer.id) {
    return false
  }

  const pair = [actor.role, peer.role]

  return !(pair.includes('admin') && pair.includes('employee'))
}

/**
 * Standard base64 with padding, exactly as `@opsflow/crypto` writes it: the
 * length a multiple of four, the alphabet strict, and the padding matching
 * what the last group needs. `Buffer.from(text, 'base64')` accepts far less
 * than this and silently drops what it cannot read, so the API checks the
 * form before decoding rather than storing whatever came out.
 */
export const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

/**
 * The base64 form of exactly `bytes` bytes: the length says how many
 * groups, and the padding says how many bytes the last group carries —
 * 32 bytes is 43 characters and one `=`, and 44 bare characters would be 33.
 */
const base64 = (bytes: number, label: string) => {
  const padding = (3 - (bytes % 3)) % 3
  const characters = Math.ceil(bytes / 3) * 4 - padding

  return z
    .string()
    .regex(
      new RegExp(`^[A-Za-z0-9+/]{${characters}}={${padding}}$`),
      `${label} must be ${bytes} bytes in base64`,
    )
}

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0

/**
 * The key backup, as `GET` / `PUT /api/dm/key` carries it. The secret half is
 * sealed under the owner's password (`wrapKeyPair` in `@opsflow/crypto`); the
 * server stores the blob and returns it to its owner alone.
 *
 * `currentPassword` travels only when a backup is being replaced — after a
 * password change — and is checked, never stored: a session cookie alone is
 * not enough to overwrite the one copy that lets a new device in.
 */
export const dmKeySchema = z.object({
  publicKey: base64(32, 'The public key'),
  wrappedSecretKey: base64(48, 'The wrapped secret key'),
  wrapNonce: base64(24, 'The nonce'),
  kdfSalt: base64(16, 'The salt'),
  kdf: z.object({
    name: z.literal('scrypt'),
    n: z
      .number()
      .int()
      .min(2 ** 14)
      .max(2 ** 20)
      .refine(isPowerOfTwo, 'The scrypt cost must be a power of two'),
    r: z.number().int().min(1).max(32),
    p: z.number().int().min(1).max(16),
  }),
  version: z.literal(1),
  currentPassword: z.string().min(1).optional(),
})

export type DmKeyInput = z.infer<typeof dmKeySchema>

/** What the server keeps and returns: the record without the password. */
export type DmKeyRecord = Omit<DmKeyInput, 'currentPassword'> & { updatedAt: string }

/** Someone the caller may write to. `publicKey` is null until they have signed in once. */
export type DmContact = {
  id: string
  name: string
  position: string | null
  role: RoleName
  department: NamedRef | null
  publicKey: string | null
}

export const dmContactsQuerySchema = z.object({
  q: optionalText,
})

export type DmContactsQuery = z.infer<typeof dmContactsQuerySchema>

/** The other party, with what is needed to seal a message to them. */
export type DmPeer = {
  id: string
  name: string
  role: RoleName
  status: UserStatus
  publicKey: string | null
}

export type DmMessageItem = {
  id: string
  conversationId: string
  senderId: string
  ciphertext: string
  nonce: string
  version: number
  createdAt: string
}

export type DmConversationItem = {
  id: string
  peer: DmPeer
  /** Messages from the peer since the caller last opened the thread. */
  unread: number
  lastMessage: DmMessageItem | null
  createdAt: string
}

/**
 * Newest first, keyed on the id rather than an offset: ids are UUIDv7 and so
 * time-ordered, and a thread that is being written to would otherwise shift
 * under an offset page. `hasMore` says whether an older page exists.
 */
export type DmMessagePage = {
  items: DmMessageItem[]
  hasMore: boolean
}

export const dmMessageListQuerySchema = z.object({
  before: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DM_MESSAGE_PAGE_SIZE),
})

export type DmMessageListQuery = z.infer<typeof dmMessageListQuerySchema>

export const createDmConversationSchema = z.object({
  userId: z.uuid('Choose a person'),
})

export type CreateDmConversationInput = z.infer<typeof createDmConversationSchema>

/** The smallest sealed message: an empty text and its 16-byte tag, in base64. */
export const DM_CIPHERTEXT_MIN = 24

export const sendDmMessageSchema = z.object({
  ciphertext: z
    .string()
    .min(DM_CIPHERTEXT_MIN, 'The message is empty')
    .max(DM_CIPHERTEXT_MAX, 'The message is too long')
    .regex(BASE64_PATTERN, 'The message must be base64'),
  nonce: base64(24, 'The nonce'),
  version: z.literal(1).default(1),
})

export type SendDmMessageInput = z.infer<typeof sendDmMessageSchema>

export type DmUnreadCount = { count: number }

/**
 * Several fetches of one thread as a single list, oldest first and
 * deduplicated by id. The clients poll the newest page and load older ones
 * on demand, and ids are UUIDv7, so ordering by id is ordering by time.
 */
export function mergeMessages(...pages: DmMessageItem[][]): DmMessageItem[] {
  const byId = new Map<string, DmMessageItem>()

  for (const page of pages) {
    for (const message of page) {
      byId.set(message.id, message)
    }
  }

  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
