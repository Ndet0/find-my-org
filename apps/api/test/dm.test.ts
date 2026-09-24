import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  deriveConversationKey,
  fromBase64,
  generateKeyPair,
  type KeyPair,
  messageAad,
  openMessage,
  sealMessage,
  wrapKeyPair,
} from '@opsflow/crypto'
import { prisma } from '@opsflow/db'
import type {
  DmConversationItem,
  DmKeyRecord,
  DmMessageItem,
  DmMessagePage,
} from '@opsflow/types/dm'
import { app } from '../src/app'
import {
  ACCOUNTS,
  assertSeededAccounts,
  cookieFrom,
  PASSWORD,
  type Role,
  signInRequest,
} from './helpers'

/**
 * Direct messages, against the assembled app on the seeded database: the
 * role rule, key registration, and one conversation sealed and opened with
 * the real `@opsflow/crypto` so the wire contract is proven end to end.
 *
 * The seeded accounts' keys and conversations are removed before and after,
 * so the file can run again and leaves the development database as it was.
 */

const FAST_KDF = { name: 'scrypt' as const, n: 2 ** 14, r: 8, p: 1 }

type Session = { cookie: string; id: string }

const sessions = {} as Record<Role, Session>
const pairs = {} as Record<Role, KeyPair>

async function signIn(role: Role): Promise<Session> {
  const response = await signInRequest(ACCOUNTS[role], PASSWORD)
  const cookie = cookieFrom(response)
  const me = await app.request('/api/me', { headers: { cookie } })
  const body = (await me.json()) as { data: { id: string } }
  return { cookie, id: body.data.id }
}

async function call(role: Role, path: string, init: { method?: string; body?: unknown } = {}) {
  const response = await app.request(`/api/dm${path}`, {
    method: init.method ?? 'GET',
    headers: { 'content-type': 'application/json', cookie: sessions[role].cookie },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = (await response.json()) as {
    success: boolean
    data?: unknown
    error?: { code: string }
  }
  return { status: response.status, ...json }
}

async function registerKey(role: Role) {
  pairs[role] = generateKeyPair()
  const record = await wrapKeyPair(pairs[role], PASSWORD, sessions[role].id, FAST_KDF)
  return call(role, '/key', { method: 'PUT', body: record })
}

async function resetSeededMessaging() {
  const ids = Object.values(sessions).map((session) => session.id)
  await prisma.dmConversation.deleteMany({
    where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] },
  })
  await prisma.dmKey.deleteMany({ where: { userId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { userId: { in: ids }, type: 'message' } })
}

beforeAll(async () => {
  await assertSeededAccounts()
  for (const role of ['admin', 'manager', 'employee'] as const) {
    sessions[role] = await signIn(role)
  }
  await resetSeededMessaging()
})

afterAll(resetSeededMessaging)

describe('keys', () => {
  test('there is no key until one is registered', async () => {
    const before = await call('manager', '/key')
    expect(before.status).toBe(200)
    expect(before.data).toBeNull()

    const put = await registerKey('manager')
    expect(put.status).toBe(200)

    const after = await call('manager', '/key')
    expect((after.data as DmKeyRecord).publicKey).toBe(
      Buffer.from(pairs.manager.publicKey).toString('base64'),
    )
  })

  test('a malformed record is a 422', async () => {
    const response = await call('employee', '/key', {
      method: 'PUT',
      body: { publicKey: 'short', wrappedSecretKey: 'x', wrapNonce: 'y', kdfSalt: 'z' },
    })
    expect(response.status).toBe(422)
    expect(response.error?.code).toBe('VALIDATION_ERROR')
  })

  test('re-wrapping keeps the public key and needs the account password; replacing it is refused', async () => {
    const rewrapped = await wrapKeyPair(
      pairs.manager,
      'a new password',
      sessions.manager.id,
      FAST_KDF,
    )

    // A session cookie alone may not overwrite the backup.
    const noPassword = await call('manager', '/key', { method: 'PUT', body: rewrapped })
    expect(noPassword.status).toBe(403)

    const wrongPassword = await call('manager', '/key', {
      method: 'PUT',
      body: { ...rewrapped, currentPassword: 'not the password' },
    })
    expect(wrongPassword.status).toBe(403)

    const stored = await prisma.dmKey.findUniqueOrThrow({ where: { userId: sessions.manager.id } })
    expect(Buffer.from(stored.wrappedSecretKey).toString('base64')).not.toBe(
      rewrapped.wrappedSecretKey,
    )

    const accepted = await call('manager', '/key', {
      method: 'PUT',
      body: { ...rewrapped, currentPassword: PASSWORD },
    })
    expect(accepted.status).toBe(200)
    expect((accepted.data as DmKeyRecord).wrappedSecretKey).toBe(rewrapped.wrappedSecretKey)
    expect('currentPassword' in (accepted.data as object)).toBe(false)

    const replaced = await wrapKeyPair(generateKeyPair(), PASSWORD, sessions.manager.id, FAST_KDF)
    const refused = await call('manager', '/key', {
      method: 'PUT',
      body: { ...replaced, currentPassword: PASSWORD },
    })
    expect(refused.status).toBe(409)
    expect(refused.error?.code).toBe('DM_KEY_EXISTS')
  })

  test('two first uploads at once keep exactly one key', async () => {
    const candidates = [generateKeyPair(), generateKeyPair()]
    const records = await Promise.all(
      candidates.map((pair) => wrapKeyPair(pair, PASSWORD, sessions.admin.id, FAST_KDF)),
    )

    const results = await Promise.all(
      records.map((record) => call('admin', '/key', { method: 'PUT', body: record })),
    )
    const statuses = results.map((result) => result.status).sort()
    expect(statuses).toEqual([200, 409])

    const kept = await call('admin', '/key')
    const winner = candidates.find(
      (pair) =>
        Buffer.from(pair.publicKey).toString('base64') === (kept.data as DmKeyRecord).publicKey,
    )
    expect(winner).toBeDefined()
    pairs.admin = winner as KeyPair
  })
})

describe('who may message whom', () => {
  test('an employee cannot open a conversation with an administrator, nor the reverse', async () => {
    const up = await call('employee', '/conversations', {
      method: 'POST',
      body: { userId: sessions.admin.id },
    })
    expect(up.status).toBe(403)

    const down = await call('admin', '/conversations', {
      method: 'POST',
      body: { userId: sessions.employee.id },
    })
    expect(down.status).toBe(403)
  })

  test('the contact list applies the same rule', async () => {
    const names = async (role: Role) =>
      ((await call(role, '/contacts')).data as { id: string }[]).map((contact) => contact.id)

    expect(await names('employee')).not.toContain(sessions.admin.id)
    expect(await names('employee')).toContain(sessions.manager.id)
    expect(await names('admin')).not.toContain(sessions.employee.id)
    expect(await names('admin')).toContain(sessions.manager.id)
    expect(await names('manager')).toContain(sessions.admin.id)
    expect(await names('manager')).toContain(sessions.employee.id)
    expect(await names('manager')).not.toContain(sessions.manager.id)
  })

  test('nobody messages themselves, and a guessed id says nothing', async () => {
    const self = await call('manager', '/conversations', {
      method: 'POST',
      body: { userId: sessions.manager.id },
    })
    expect(self.status).toBe(403)

    const unknown = await call('manager', '/conversations', {
      method: 'POST',
      body: { userId: crypto.randomUUID() },
    })
    expect(unknown.status).toBe(403)
    expect(unknown.error?.code).toBe('FORBIDDEN')
  })

  test('a peer without a key cannot be written to yet', async () => {
    const response = await call('manager', '/conversations', {
      method: 'POST',
      body: { userId: sessions.employee.id },
    })
    expect(response.status).toBe(409)
    expect(response.error?.code).toBe('DM_PEER_NOT_READY')
  })

  test('a caller without a key cannot start one either', async () => {
    const response = await call('employee', '/conversations', {
      method: 'POST',
      body: { userId: sessions.manager.id },
    })
    // The employee has no key yet; the manager does.
    expect(response.status).toBe(409)
    expect(response.error?.code).toBe('DM_KEY_MISSING')
  })
})

describe('a conversation', () => {
  let conversation: DmConversationItem

  test('opens once for both sides once both have keys', async () => {
    expect((await registerKey('employee')).status).toBe(200)

    const opened = await call('manager', '/conversations', {
      method: 'POST',
      body: { userId: sessions.employee.id },
    })
    expect(opened.status).toBe(201)
    conversation = opened.data as DmConversationItem
    expect(conversation.peer.id).toBe(sessions.employee.id)
    expect(conversation.peer.publicKey).toBe(
      Buffer.from(pairs.employee.publicKey).toString('base64'),
    )

    const again = await call('employee', '/conversations', {
      method: 'POST',
      body: { userId: sessions.manager.id },
    })
    expect((again.data as DmConversationItem).id).toBe(conversation.id)
    expect((again.data as DmConversationItem).peer.id).toBe(sessions.manager.id)
  })

  test('opens once when both sides ask at the same moment', async () => {
    const [fromManager, fromAdmin] = await Promise.all([
      call('manager', '/conversations', { method: 'POST', body: { userId: sessions.admin.id } }),
      call('admin', '/conversations', { method: 'POST', body: { userId: sessions.manager.id } }),
    ])
    expect(fromManager.status).toBe(201)
    expect(fromAdmin.status).toBe(201)
    expect((fromManager.data as DmConversationItem).id).toBe(
      (fromAdmin.data as DmConversationItem).id,
    )
  })

  test('is invisible to anyone else, for reading and for writing', async () => {
    expect((await call('admin', `/conversations/${conversation.id}`)).status).toBe(404)
    expect((await call('admin', `/conversations/${conversation.id}/messages`)).status).toBe(404)

    const key = deriveConversationKey(pairs.admin.secretKey, pairs.manager.publicKey)
    const sealed = sealMessage(key, 'intruding', messageAad(conversation.id, sessions.admin.id))
    const sent = await call('admin', `/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: sealed,
    })
    expect(sent.status).toBe(404)

    const read = await call('admin', `/conversations/${conversation.id}/read`, { method: 'POST' })
    expect(read.status).toBe(404)

    const malformed = await call('admin', '/conversations/not-a-uuid')
    expect(malformed.status).toBe(422)
  })

  test('can be read by a participant', async () => {
    const seen = await call('employee', `/conversations/${conversation.id}`)
    expect(seen.status).toBe(200)
    expect((seen.data as DmConversationItem).peer.id).toBe(sessions.manager.id)
  })

  test('carries a sealed message the other side can open, and only ciphertext in between', async () => {
    const key = deriveConversationKey(
      pairs.manager.secretKey,
      fromBase64(conversation.peer.publicKey as string),
    )
    const sealed = sealMessage(
      key,
      'Can you cover the Friday shift?',
      messageAad(conversation.id, sessions.manager.id),
    )

    const sent = await call('manager', `/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: sealed,
    })
    expect(sent.status).toBe(201)
    const message = sent.data as DmMessageItem
    expect(message.senderId).toBe(sessions.manager.id)

    const stored = await prisma.dmMessage.findUniqueOrThrow({ where: { id: message.id } })
    expect(Buffer.from(stored.ciphertext).toString('utf8')).not.toContain('Friday')

    const page = await call('employee', `/conversations/${conversation.id}/messages`)
    const items = (page.data as DmMessagePage).items
    expect(items).toHaveLength(1)

    const employeeKey = deriveConversationKey(pairs.employee.secretKey, pairs.manager.publicKey)
    expect(
      openMessage(
        employeeKey,
        items[0] as DmMessageItem,
        messageAad(conversation.id, sessions.manager.id),
      ),
    ).toBe('Can you cover the Friday shift?')
  })

  test('counts as unread for the recipient until they open it, and notifies them once', async () => {
    expect((await call('employee', '/unread-count')).data).toEqual({ count: 1 })
    expect((await call('manager', '/unread-count')).data).toEqual({ count: 0 })

    const list = await call('employee', '/conversations')
    const mine = (list.data as DmConversationItem[]).find((item) => item.id === conversation.id)
    expect(mine?.unread).toBe(1)
    expect(mine?.lastMessage?.senderId).toBe(sessions.manager.id)

    const notifications = await prisma.notification.findMany({
      where: { userId: sessions.employee.id, type: 'message', isRead: false },
    })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.message).not.toContain('Friday')

    const read = await call('employee', `/conversations/${conversation.id}/read`, {
      method: 'POST',
    })
    expect(read.data).toEqual({ count: 0 })

    // Nothing is waiting anywhere now, so the notification is settled too.
    const settled = await prisma.notification.count({
      where: { userId: sessions.employee.id, type: 'message', isRead: false },
    })
    expect(settled).toBe(0)
  })

  test('pages newest first on a cursor', async () => {
    const key = deriveConversationKey(pairs.employee.secretKey, pairs.manager.publicKey)
    const aad = messageAad(conversation.id, sessions.employee.id)
    for (const text of ['one', 'two', 'three']) {
      const sent = await call('employee', `/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: sealMessage(key, text, aad),
      })
      expect(sent.status).toBe(201)
    }

    const first = (await call('manager', `/conversations/${conversation.id}/messages?pageSize=2`))
      .data as DmMessagePage
    expect(first.items).toHaveLength(2)
    expect(first.hasMore).toBe(true)
    expect(openMessage(key, first.items[0] as DmMessageItem, aad)).toBe('three')

    const cursor = (first.items[1] as DmMessageItem).id
    const second = (
      await call(
        'manager',
        `/conversations/${conversation.id}/messages?pageSize=2&before=${cursor}`,
      )
    ).data as DmMessagePage
    expect(second.items).toHaveLength(2)
    expect(second.hasMore).toBe(false)
    expect(openMessage(key, second.items[0] as DmMessageItem, aad)).toBe('one')

    // Three replies, one notification: the manager had nothing unread here yet.
    const notifications = await prisma.notification.count({
      where: { userId: sessions.manager.id, type: 'message' },
    })
    expect(notifications).toBe(1)
    expect((await call('manager', '/unread-count')).data).toEqual({ count: 3 })
  })

  test('refuses a message that is not base64 or is too long', async () => {
    const bad = await call('employee', `/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: { ciphertext: 'not base64!', nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    })
    expect(bad.status).toBe(422)

    const long = await call('employee', `/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: { ciphertext: 'A'.repeat(28_004), nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    })
    expect(long.status).toBe(422)

    // Base64 that `Buffer.from` would quietly truncate is refused up front.
    const ragged = await call('employee', `/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: { ciphertext: 'A'.repeat(25), nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    })
    expect(ragged.status).toBe(422)

    const tooShort = await call('employee', `/conversations/${conversation.id}/messages`, {
      method: 'POST',
      body: { ciphertext: 'AAAAAAAA', nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    })
    expect(tooShort.status).toBe(422)
  })
})
