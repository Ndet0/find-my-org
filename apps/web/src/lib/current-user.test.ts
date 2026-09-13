import { afterEach, describe, expect, test } from 'bun:test'
import type { CurrentUser } from '@opsflow/types/user'
import { isRedirect } from '@tanstack/react-router'
import { fail, mockApi, ok } from '../../test/api-mock'
import { testQueryClient } from '../../test/render'
import { isSignedIn, requireUser } from './current-user'

/**
 * The session guard behind every protected route, and the login page's
 * probe. Tested without rendering: `requireUser` is what `_authed`'s
 * `beforeLoad` returns or throws, and the redirect it throws is the whole
 * decision. See test/render.tsx for the rules.
 */

const user = {
  id: 'u1',
  name: 'Emma Employee',
  email: 'employee@opsflow.local',
  phone: null,
  position: 'Software Engineer',
  avatarUrl: null,
  status: 'active',
  joinedAt: '2026-01-01',
  role: { id: 'r1', name: 'employee' },
  department: { id: 'd1', name: 'Engineering' },
} satisfies CurrentUser

let api: ReturnType<typeof mockApi> | undefined

afterEach(() => api?.restore())

describe('requireUser', () => {
  test('returns the profile and asks the API once', async () => {
    api = mockApi({ 'GET /api/me': ok(user) })
    const queryClient = testQueryClient()

    expect(await requireUser(queryClient)).toEqual(user)
    expect(await requireUser(queryClient)).toEqual(user)
    expect(api.calls).toHaveLength(1)
  })

  test('a rejected session is a redirect to the login page', async () => {
    api = mockApi({ 'GET /api/me': fail('UNAUTHORIZED', 'Sign in to continue', 401) })

    const thrown = await requireUser(testQueryClient()).catch((error) => error)

    expect(isRedirect(thrown)).toBe(true)
    expect(thrown.options.to).toBe('/login')
  })
})

describe('isSignedIn', () => {
  test('answers from the same query, true or false', async () => {
    api = mockApi({ 'GET /api/me': ok(user) })
    expect(await isSignedIn(testQueryClient())).toBe(true)
    api.restore()

    api = mockApi({ 'GET /api/me': fail('UNAUTHORIZED', 'Sign in to continue', 401) })
    expect(await isSignedIn(testQueryClient())).toBe(false)
  })
})
