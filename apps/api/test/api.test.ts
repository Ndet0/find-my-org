import { describe, expect, test } from 'bun:test'
import { app } from '../src/app'

/**
 * Runs against the assembled Hono app in-process, on the development
 * database seeded by `pnpm db:seed`. No listener, no port: `app.request()`
 * exercises the same middleware chain a real request would.
 *
 * These are the contracts that both clients depend on: the session round
 * trip, the trusted-origin check, and one authorization decision per role.
 */

const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'opsflow-dev-password'
const WEB_ORIGIN = process.env.WEB_URL ?? 'http://localhost:5173'
const MOBILE_ORIGIN = 'opsflow://'

const ACCOUNTS = {
  admin: 'admin@opsflow.local',
  manager: 'manager@opsflow.local',
  employee: 'employee@opsflow.local',
} as const

type Role = keyof typeof ACCOUNTS

async function signIn(role: Role, origin = WEB_ORIGIN) {
  const response = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ email: ACCOUNTS[role], password: PASSWORD }),
  })

  // Better Auth may set more than one cookie; a client sends back the
  // name=value pairs and nothing else, which is what the mobile app does.
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ')

  return { response, cookie }
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
