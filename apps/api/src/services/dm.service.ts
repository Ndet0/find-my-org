import { verifyPassword } from '@opsflow/auth'
import { Prisma, prisma } from '@opsflow/db'
import {
  type CreateDmConversationInput,
  canDirectMessage,
  type DmContact,
  type DmContactsQuery,
  type DmConversationItem,
  type DmKeyInput,
  type DmKeyRecord,
  type DmMessageItem,
  type DmMessageListQuery,
  type DmMessagePage,
  type DmPeer,
  type DmUnreadCount,
  type SendDmMessageInput,
} from '@opsflow/types/dm'
import { can, isRoleName, type RoleName } from '@opsflow/types/permissions'
import { AppError, conflict, forbidden, notFound } from '../lib/errors.js'
import type { EventActor } from './activity.service.js'
import { notify } from './notification.service.js'

/**
 * Direct messages. The server is a relay and a store: it decides who may
 * talk to whom, keeps ciphertext and public keys, and counts what is unread.
 * It never holds a key that opens a message, so nothing here is logged to
 * the activity trail — there is no content to describe, and who talks to
 * whom in private is not an organisational event.
 *
 * Byte columns cross the wire as base64; the clients agree on the same
 * encoding through `@opsflow/crypto`. The schemas in `@opsflow/types/dm`
 * accept only canonical base64, so decoding here is exact.
 */

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64')
// Copied into a fresh buffer: Prisma types a byte column as
// `Uint8Array<ArrayBuffer>`, and a `Buffer` view may sit on the shared pool.
const fromBase64 = (text: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(Buffer.from(text, 'base64')).slice() as Uint8Array<ArrayBuffer>

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

/**
 * Fails closed, like `requireAuth`: a role the permission matrix does not
 * know is a data problem, and nobody with one takes part in messaging.
 */
function toRoleName(name: string): RoleName {
  if (!isRoleName(name)) {
    throw new AppError('UNKNOWN_ROLE', 'This account has no recognised role', 403)
  }

  return name
}

// ---------------------------------------------------------------------------
// Keys

const keySelect = {
  publicKey: true,
  wrappedSecretKey: true,
  wrapNonce: true,
  kdfSalt: true,
  kdfParams: true,
  version: true,
  updatedAt: true,
} satisfies Prisma.DmKeySelect

type KeyRow = Prisma.DmKeyGetPayload<{ select: typeof keySelect }>

function toKeyRecord(row: KeyRow): DmKeyRecord {
  return {
    publicKey: toBase64(row.publicKey),
    wrappedSecretKey: toBase64(row.wrappedSecretKey),
    wrapNonce: toBase64(row.wrapNonce),
    kdfSalt: toBase64(row.kdfSalt),
    kdf: row.kdfParams as DmKeyRecord['kdf'],
    version: row.version as DmKeyRecord['version'],
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** The caller's own backup, or null before they have set one up. */
export async function getOwnKey(userId: string): Promise<DmKeyRecord | null> {
  const row = await prisma.dmKey.findUnique({ where: { userId }, select: keySelect })
  return row ? toKeyRecord(row) : null
}

/**
 * Registers the caller's key, or re-wraps it after a password change.
 *
 * The public half may not change once set: every message ever sent to this
 * person was sealed to it, and a replaced key would leave them unreadable.
 * The wrapped half may be replaced — that is what a password change needs —
 * but only by someone who knows the account password: the backup is the
 * one copy that lets a new device in, and a stolen session cookie must not
 * be able to overwrite it with something that will never open.
 *
 * The first registration is a plain insert, so two devices signing in at
 * once cannot each register a different key: the second insert hits the
 * primary key and is refused, and that device unwraps the winner's backup.
 */
export async function putOwnKey(input: DmKeyInput, userId: string): Promise<DmKeyRecord> {
  const { currentPassword, ...record } = input
  const publicKey = fromBase64(record.publicKey)
  const data = {
    publicKey,
    wrappedSecretKey: fromBase64(record.wrappedSecretKey),
    wrapNonce: fromBase64(record.wrapNonce),
    kdfSalt: fromBase64(record.kdfSalt),
    kdfParams: record.kdf,
    version: record.version,
  }

  const current = await prisma.dmKey.findUnique({ where: { userId }, select: { publicKey: true } })

  if (!current) {
    try {
      const row = await prisma.dmKey.create({ data: { userId, ...data }, select: keySelect })
      return toKeyRecord(row)
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error
      }
      // Another sign-in registered a key between the read and the insert;
      // fall through to the replacement rules against what it stored.
    }
  }

  const stored = await prisma.dmKey.findUniqueOrThrow({
    where: { userId },
    select: { publicKey: true },
  })

  if (!Buffer.from(stored.publicKey).equals(publicKey)) {
    throw conflict(
      'DM_KEY_EXISTS',
      'A different messaging key is already registered for this account',
    )
  }

  if (!currentPassword) {
    throw forbidden('Your password is needed to replace your messaging key backup')
  }

  if (!(await verifyPassword(userId, currentPassword))) {
    throw forbidden('That is not your current password')
  }

  // Conditional on the public key still matching, so a concurrent request
  // cannot slip a different key in between the check and the write.
  const { count } = await prisma.dmKey.updateMany({ where: { userId, publicKey }, data })

  if (count === 0) {
    throw conflict(
      'DM_KEY_EXISTS',
      'A different messaging key is already registered for this account',
    )
  }

  const row = await prisma.dmKey.findUniqueOrThrow({ where: { userId }, select: keySelect })
  return toKeyRecord(row)
}

// ---------------------------------------------------------------------------
// Contacts

const peerSelect = {
  id: true,
  name: true,
  status: true,
  role: { select: { name: true } },
  dmKey: { select: { publicKey: true } },
} satisfies Prisma.UserSelect

type PeerRow = Prisma.UserGetPayload<{ select: typeof peerSelect }>

function toPeer(row: PeerRow): DmPeer {
  return {
    id: row.id,
    name: row.name,
    role: toRoleName(row.role.name),
    status: row.status,
    publicKey: row.dmKey ? toBase64(row.dmKey.publicKey) : null,
  }
}

/** The roles the caller's role may write to; the inverse of `canDirectMessage`. */
function reachableRoles(role: RoleName): RoleName[] {
  switch (role) {
    case 'admin':
      return ['admin', 'manager']
    case 'employee':
      return ['manager', 'employee']
    default:
      return ['admin', 'manager', 'employee']
  }
}

/**
 * Everyone the caller may start a conversation with: active, not
 * themselves, and within the role rule. Not gated by `users:read` — an
 * employee has no directory, but needs to find a colleague to write to.
 * Capped rather than paged; a picker with a search box is what reads it.
 *
 * The search matches what the caller is shown. Email is never shown here,
 * and matching on it would let someone without the directory confirm a
 * guessed address, so only a caller with `users:read` may search by it.
 */
export async function listContacts(
  query: DmContactsQuery,
  actor: EventActor,
): Promise<DmContact[]> {
  const where: Prisma.UserWhereInput = {
    id: { not: actor.id },
    status: 'active',
    role: { name: { in: reachableRoles(actor.role) } },
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { position: { contains: query.q, mode: 'insensitive' } },
      ...(can(actor.role, 'users:read')
        ? [{ email: { contains: query.q, mode: 'insensitive' as const } }]
        : []),
    ]
  }

  const rows = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      position: true,
      role: { select: { name: true } },
      department: { select: { id: true, name: true } },
      dmKey: { select: { publicKey: true } },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: 100,
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    position: row.position,
    role: toRoleName(row.role.name),
    department: row.department,
    publicKey: row.dmKey ? toBase64(row.dmKey.publicKey) : null,
  }))
}

// ---------------------------------------------------------------------------
// Conversations

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  ciphertext: true,
  nonce: true,
  version: true,
  createdAt: true,
} satisfies Prisma.DmMessageSelect

type MessageRow = Prisma.DmMessageGetPayload<{ select: typeof messageSelect }>

function toMessageItem(row: MessageRow): DmMessageItem {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    ciphertext: toBase64(row.ciphertext),
    nonce: toBase64(row.nonce),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
  }
}

const conversationSelect = {
  id: true,
  userAId: true,
  userBId: true,
  userAUnread: true,
  userBUnread: true,
  createdAt: true,
  userA: { select: peerSelect },
  userB: { select: peerSelect },
  messages: { select: messageSelect, orderBy: { id: 'desc' }, take: 1 },
} satisfies Prisma.DmConversationSelect

type ConversationRow = Prisma.DmConversationGetPayload<{ select: typeof conversationSelect }>

function toConversationItem(row: ConversationRow, viewerId: string): DmConversationItem {
  const viewerIsA = row.userAId === viewerId
  const last = row.messages[0]

  return {
    id: row.id,
    peer: toPeer(viewerIsA ? row.userB : row.userA),
    unread: viewerIsA ? row.userAUnread : row.userBUnread,
    lastMessage: last ? toMessageItem(last) : null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** A conversation is visible to its two parties and nobody else. */
function memberWhere(actorId: string): Prisma.DmConversationWhereInput {
  return { OR: [{ userAId: actorId }, { userBId: actorId }] }
}

/** The stored order of a pair, whichever side asks. */
function orderedPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a }
}

export async function listConversations(actor: EventActor): Promise<DmConversationItem[]> {
  const rows = await prisma.dmConversation.findMany({
    where: memberWhere(actor.id),
    select: conversationSelect,
    // Most recent activity first; a thread nobody has written in yet sits
    // where it was opened.
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
    take: 100,
  })

  return rows.map((row) => toConversationItem(row, actor.id))
}

async function findMemberConversation(id: string, actorId: string): Promise<ConversationRow> {
  const row = await prisma.dmConversation.findFirst({
    where: { id, ...memberWhere(actorId) },
    select: conversationSelect,
  })

  // A conversation the caller is not part of is not advertised.
  if (!row) {
    throw notFound('Conversation')
  }

  return row
}

export async function getConversation(id: string, actor: EventActor): Promise<DmConversationItem> {
  return toConversationItem(await findMemberConversation(id, actor.id), actor.id)
}

/**
 * The conversation with a person, opened if it does not exist yet. Both
 * sides need a registered key before anything can be sealed to them, and
 * the role rule is enforced here and again on every message.
 *
 * The refusals name nobody: a caller without the directory could otherwise
 * learn a name, or whether an account exists, from an id they guessed.
 */
export async function openConversation(
  input: CreateDmConversationInput,
  actor: EventActor,
): Promise<DmConversationItem> {
  const peer = await prisma.user.findUnique({ where: { id: input.userId }, select: peerSelect })

  if (!peer || !canDirectMessage(actor, { id: peer.id, role: toRoleName(peer.role.name) })) {
    throw forbidden('You cannot message this person')
  }

  if (peer.status !== 'active') {
    throw conflict('DM_PEER_INACTIVE', 'This account is not active')
  }

  if (!peer.dmKey) {
    throw conflict(
      'DM_PEER_NOT_READY',
      'This person has not set up secure messaging yet. They need to sign in once first',
    )
  }

  const ownKey = await prisma.dmKey.findUnique({
    where: { userId: actor.id },
    select: { userId: true },
  })

  if (!ownKey) {
    throw conflict('DM_KEY_MISSING', 'Set up secure messaging before starting a conversation')
  }

  const pair = orderedPair(actor.id, peer.id)
  const existing = await prisma.dmConversation.findUnique({
    where: { userAId_userBId: pair },
    select: conversationSelect,
  })

  if (existing) {
    return toConversationItem(existing, actor.id)
  }

  try {
    const row = await prisma.dmConversation.create({ data: pair, select: conversationSelect })
    return toConversationItem(row, actor.id)
  } catch (error) {
    // Both sides opened it at once: the other insert won, and that row is
    // the conversation for both of them.
    if (!isUniqueViolation(error)) {
      throw error
    }

    const row = await prisma.dmConversation.findUniqueOrThrow({
      where: { userAId_userBId: pair },
      select: conversationSelect,
    })
    return toConversationItem(row, actor.id)
  }
}

// ---------------------------------------------------------------------------
// Messages

export async function listMessages(
  conversationId: string,
  query: DmMessageListQuery,
  actor: EventActor,
): Promise<DmMessagePage> {
  await findMemberConversation(conversationId, actor.id)

  // One more than asked for, to learn whether an older page exists without
  // a count; ids are UUIDv7, so `id` is the timeline.
  const rows = await prisma.dmMessage.findMany({
    where: { conversationId, ...(query.before ? { id: { lt: query.before } } : {}) },
    select: messageSelect,
    orderBy: { id: 'desc' },
    take: query.pageSize + 1,
  })

  return {
    items: rows.slice(0, query.pageSize).map(toMessageItem),
    hasMore: rows.length > query.pageSize,
  }
}

/**
 * Stores a sealed message and moves the peer's unread counter. The peer is
 * told through a notification only when they had nothing unread here, so a
 * burst of messages is one notification, not one per line. The sender's own
 * counter is cleared: writing in a thread means having read it.
 *
 * The role rule is checked again here: a role can change after a thread was
 * opened, and the thread does not outlive the rule. The unread counter is
 * read inside the transaction, so two messages sent at once cannot both see
 * it at zero and raise two notifications.
 */
export async function sendMessage(
  conversationId: string,
  input: SendDmMessageInput,
  actor: EventActor,
): Promise<DmMessageItem> {
  const conversation = await findMemberConversation(conversationId, actor.id)
  const actorIsA = conversation.userAId === actor.id
  const peer = actorIsA ? conversation.userB : conversation.userA

  if (!canDirectMessage(actor, { id: peer.id, role: toRoleName(peer.role.name) })) {
    throw forbidden('You cannot message this person')
  }

  if (peer.status !== 'active') {
    throw conflict('DM_PEER_INACTIVE', 'This account is not active')
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.dmMessage.create({
      data: {
        conversationId,
        senderId: actor.id,
        ciphertext: fromBase64(input.ciphertext),
        nonce: fromBase64(input.nonce),
        version: input.version,
      },
      select: messageSelect,
    })

    // `update` returns the row as it was after the write; the peer's counter
    // was at zero before it exactly when it is at one now.
    const updated = await tx.dmConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: row.createdAt,
        ...(actorIsA
          ? { userBUnread: { increment: 1 }, userAUnread: 0 }
          : { userAUnread: { increment: 1 }, userBUnread: 0 }),
      },
      select: { userAUnread: true, userBUnread: true },
    })

    const peerUnread = actorIsA ? updated.userBUnread : updated.userAUnread

    if (peerUnread === 1) {
      await notify(tx, {
        userId: peer.id,
        actorId: actor.id,
        title: 'New message',
        message: `${actor.name} sent you a message`,
        type: 'message',
      })
    }

    return toMessageItem(row)
  })
}

/**
 * Clears the caller's unread counter for one thread. A message notification
 * is not tied to a thread — it only says that something is waiting — so it
 * is settled once nothing is waiting anywhere: when the last unread thread
 * is opened, every unread message notification is marked read with it.
 */
export async function markConversationRead(
  conversationId: string,
  actor: EventActor,
): Promise<DmUnreadCount> {
  const conversation = await findMemberConversation(conversationId, actor.id)

  await prisma.dmConversation.update({
    where: { id: conversationId },
    data: conversation.userAId === actor.id ? { userAUnread: 0 } : { userBUnread: 0 },
  })

  const unread = await unreadCount(actor)

  if (unread.count === 0) {
    await prisma.notification.updateMany({
      where: { userId: actor.id, type: 'message', isRead: false },
      data: { isRead: true },
    })
  }

  return unread
}

/** Messages waiting for the caller across every conversation, for the badge. */
export async function unreadCount(actor: EventActor): Promise<DmUnreadCount> {
  const [asA, asB] = await prisma.$transaction([
    prisma.dmConversation.aggregate({ where: { userAId: actor.id }, _sum: { userAUnread: true } }),
    prisma.dmConversation.aggregate({ where: { userBId: actor.id }, _sum: { userBUnread: true } }),
  ])

  return { count: (asA._sum.userAUnread ?? 0) + (asB._sum.userBUnread ?? 0) }
}
