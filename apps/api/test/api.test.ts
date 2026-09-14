import { beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { APIError } from '@opsflow/auth'
import { prisma } from '@opsflow/db'
import { app } from '../src/app'
import { AppError } from '../src/lib/errors'
import { withinTimeout } from '../src/routes/health'
import { createUser } from '../src/services/user.service'
import {
  ACCOUNTS,
  assertSeededAccounts,
  cookieFrom,
  PASSWORD,
  type Role,
  signInRequest,
  WEB_ORIGIN,
} from './helpers'

/**
 * Runs against the assembled Hono app in-process, on the development
 * database seeded by `pnpm db:seed`. No listener, no port: `app.request()`
 * exercises the same middleware chain a real request would.
 *
 * These are the contracts that both clients depend on: the session round
 * trip, the trusted-origin check, and one authorization decision per role.
 */

const MOBILE_ORIGIN = 'opsflow://'

beforeAll(assertSeededAccounts)

async function signIn(role: Role, origin = WEB_ORIGIN) {
  const response = await signInRequest(ACCOUNTS[role], PASSWORD, origin)
  return { response, cookie: cookieFrom(response) }
}

async function get(path: string, cookie?: string) {
  return app.request(path, { headers: cookie ? { cookie } : {} })
}

async function json(response: Response) {
  return (await response.json()) as { success: boolean; data?: unknown; error?: { code: string } }
}

describe('session', () => {
  test('a request without a session is 401', async () => {
    const me = await get('/api/me')
    expect(me.status).toBe(401)
    expect((await json(me)).error?.code).toBe('UNAUTHORIZED')
  })

  test('sign-in from the web origin yields a cookie that /api/me accepts', async () => {
    const { response, cookie } = await signIn('admin')
    expect(response.status).toBe(200)
    expect(cookie).toContain('better-auth.session_token=')

    const me = await get('/api/me', cookie)
    expect(me.status).toBe(200)
    const body = await json(me)
    expect(body.success).toBe(true)
    expect((body.data as { email: string; role: { name: string } }).email).toBe(ACCOUNTS.admin)
    expect((body.data as { role: { name: string } }).role.name).toBe('admin')
  })

  test('sign-in from the mobile scheme is a trusted origin', async () => {
    const { response, cookie } = await signIn('employee', MOBILE_ORIGIN)
    expect(response.status).toBe(200)

    const me = await get('/api/me', cookie)
    expect(me.status).toBe(200)
  })

  test('sign-in from an unknown origin is refused', async () => {
    const { response } = await signIn('admin', 'https://evil.example')
    expect(response.status).toBe(403)
  })

  test('the public signup endpoint is closed', async () => {
    const response = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: WEB_ORIGIN },
      body: JSON.stringify({ name: 'Nobody', email: 'nobody@opsflow.local', password: PASSWORD }),
    })
    expect(response.status).toBe(403)
  })

  test('sign-out invalidates the cookie', async () => {
    const { cookie } = await signIn('manager')
    const signOut = await app.request('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: WEB_ORIGIN, cookie },
    })
    expect(signOut.status).toBe(200)

    const me = await get('/api/me', cookie)
    expect(me.status).toBe(401)
  })
})

describe('authorization', () => {
  test('admin reads the directory and the dashboard org section', async () => {
    const { cookie } = await signIn('admin')
    expect((await get('/api/users', cookie)).status).toBe(200)
    expect((await get('/api/departments', cookie)).status).toBe(200)

    const dashboard = await json(await get('/api/dashboard', cookie))
    expect((dashboard.data as { org: unknown }).org).not.toBeNull()
  })

  test('manager reads the directory but cannot write to it', async () => {
    const { cookie } = await signIn('manager')
    expect((await get('/api/users', cookie)).status).toBe(200)

    const create = await app.request('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        name: 'Nobody',
        email: 'nobody@opsflow.local',
        password: PASSWORD,
        role: 'employee',
      }),
    })
    expect(create.status).toBe(403)
    expect((await json(create)).error?.code).toBe('FORBIDDEN')
  })

  test('employee sees their own work and nothing organisation-wide', async () => {
    const { cookie } = await signIn('employee')
    expect((await get('/api/me', cookie)).status).toBe(200)
    expect((await get('/api/tasks', cookie)).status).toBe(200)
    expect((await get('/api/projects', cookie)).status).toBe(200)
    expect((await get('/api/notifications/unread-count', cookie)).status).toBe(200)

    expect((await get('/api/users', cookie)).status).toBe(403)
    expect((await get('/api/clients', cookie)).status).toBe(403)
    expect((await get('/api/departments', cookie)).status).toBe(403)

    const dashboard = await json(await get('/api/dashboard', cookie))
    expect((dashboard.data as { org: unknown }).org).toBeNull()
  })

  test('employee cannot create a task', async () => {
    const { cookie } = await signIn('employee')
    const create = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ title: 'Nope', projectId: '00000000-0000-7000-8000-000000000000' }),
    })
    expect(create.status).toBe(403)
  })
})

describe('request limits and the health probe', () => {
  test('a body past the limit is refused before it is read by a route', async () => {
    const { cookie } = await signIn('manager')
    const response = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ title: 'x'.repeat(100 * 1024), projectId: 'irrelevant' }),
    })
    expect(response.status).toBe(413)
    // Still the envelope: `onError` maps Hono's own exception into it.
    expect((await json(response)).success).toBe(false)
  })

  test('the probe gives up on a database that never answers', async () => {
    // Prisma's client proxies its methods, so the query itself cannot be
    // stubbed; the budget is applied by `withinTimeout`, tested on its own.
    const hung = new Promise<never>(() => undefined)
    const startedAt = performance.now()

    await expect(withinTimeout(hung, 50)).rejects.toThrow('no answer within 50 ms')
    expect(performance.now() - startedAt).toBeLessThan(1_000)
    await expect(withinTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok')
  })

  test('the health probe is open and answers when the database does', async () => {
    const response = await get('/api/health')
    expect(response.status).toBe(200)
    expect((await json(response)).success).toBe(true)
  })
})

describe('creating an account', () => {
  const actor = { id: '00000000-0000-7000-8000-000000000000', name: 'Test', role: 'admin' as const }

  test("Better Auth refusing the request is the caller's 400, with its message", async () => {
    // Past Better Auth's own ceiling, which the validator would catch on the
    // HTTP path; calling the service directly reaches Better Auth's refusal.
    const thrown = await createUser(
      {
        name: 'Too Long',
        email: 'too-long@opsflow.local',
        password: 'x'.repeat(300),
        role: 'employee',
      },
      actor,
    ).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(AppError)
    expect((thrown as AppError).code).toBe('SIGNUP_FAILED')
    expect((thrown as AppError).status).toBe(400)
    expect(await prisma.user.findUnique({ where: { email: 'too-long@opsflow.local' } })).toBeNull()
  })

  test('a fault after Better Auth has committed removes the half-made account', async () => {
    const failing = spyOn(prisma, '$transaction').mockImplementation(() => {
      throw new Error('simulated database fault')
    })

    try {
      const thrown = await createUser(
        {
          name: 'Half Made',
          email: 'half-made@opsflow.local',
          password: PASSWORD,
          role: 'employee',
        },
        actor,
      ).catch((error: unknown) => error)

      // Not a Better Auth refusal, so not a 400 — it reaches `onError` as a fault.
      expect(thrown).toBeInstanceOf(Error)
      expect(thrown).not.toBeInstanceOf(AppError)
      expect(thrown).not.toBeInstanceOf(APIError)
    } finally {
      failing.mockRestore()
    }

    expect(await prisma.user.findUnique({ where: { email: 'half-made@opsflow.local' } })).toBeNull()
  })
})
