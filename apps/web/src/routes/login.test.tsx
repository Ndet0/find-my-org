import { afterEach, describe, expect, spyOn, test } from 'bun:test'
// The DOM must exist before anything renders; see test/setup.ts.
import '../../test/setup'
import type { CurrentUser } from '@opsflow/types/user'
import { currentUserQueryOptions } from '@/lib/current-user'
import { fail, mockApi, ok } from '../../test/api-mock'
import { cleanup, fireEvent, renderWithProviders, screen, waitFor } from '../../test/render'

// The component is imported after the static imports have run, so the DOM
// from test/setup.ts exists before its dependencies are linked: libraries
// decide at load time whether a document exists (layout effects, portals),
// and `bun test` from the repository root has no preload to settle that.
const { LoginPage } = await import('./login')

/**
 * The sign-in flow end to end from the page: local validation, Better Auth
 * refusing, Better Auth accepting and /api/me confirming, and the case in
 * between — a session Better Auth issued for an account /api/me rejects,
 * which the page discards rather than leaving behind.
 *
 * Better Auth's client calls the global `fetch` at call time, so it is
 * driven through the same mock as the envelope endpoints; no module mock.
 * See test/render.tsx for the rules.
 */

const user = {
  id: 'u1',
  name: 'Emma Employee',
  email: 'employee@opsflow.local',
  phone: null,
  position: null,
  avatarUrl: null,
  status: 'active',
  joinedAt: null,
  role: { id: 'r1', name: 'employee' },
  department: null,
} satisfies CurrentUser

const SIGN_IN = 'POST /api/auth/sign-in/email'
const SIGN_OUT = 'POST /api/auth/sign-out'

let api: ReturnType<typeof mockApi> | undefined

afterEach(() => api?.restore())
afterEach(cleanup)

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginPage', () => {
  test('an empty form is refused on both fields and sends nothing', async () => {
    api = mockApi({})
    await renderWithProviders(<LoginPage />)

    await screen.findByLabelText('Email')
    submit()

    const email = await screen.findByLabelText('Email')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toBe('email-error')
    expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Enter your password')).toBeTruthy()
    expect(api.calls).toEqual([])
  })

  test("a refused credential is announced with Better Auth's message", async () => {
    api = mockApi({
      [SIGN_IN]: {
        status: 401,
        body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
      },
    })
    await renderWithProviders(<LoginPage />)

    await screen.findByLabelText('Email')
    fill('employee@opsflow.local', 'wrong-password')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Invalid email or password')
    expect(api.calls.map((call) => call.path)).toEqual(['/api/auth/sign-in/email'])
  })

  test('an accepted credential confirmed by /api/me lands on the dashboard', async () => {
    api = mockApi({
      [SIGN_IN]: { status: 200, body: { user: { id: 'u1' }, token: 't' } },
      'GET /api/me': ok(user),
    })
    const { router } = await renderWithProviders(<LoginPage />)

    await screen.findByLabelText('Email')
    fill('employee@opsflow.local', 'opsflow-dev-password')
    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(api.calls.map((call) => call.path)).toEqual(['/api/auth/sign-in/email', '/api/me'])
    expect(api.calls[0]?.body).toMatchObject({ email: 'employee@opsflow.local' })
  })

  test('an internal ?redirect= is honoured and an external one is not', async () => {
    api = mockApi({
      [SIGN_IN]: { status: 200, body: { user: { id: 'u1' }, token: 't' } },
      'GET /api/me': ok(user),
    })
    const { router } = await renderWithProviders(<LoginPage />, {
      initialPath: '/?redirect=%2Ftasks%3Fstatus%3Dblocked',
    })

    await screen.findByLabelText('Email')
    fill('employee@opsflow.local', 'opsflow-dev-password')
    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/tasks'))
    expect(router.state.location.search).toEqual({ status: 'blocked' })
    api.restore()
    cleanup()

    api = mockApi({
      [SIGN_IN]: { status: 200, body: { user: { id: 'u1' }, token: 't' } },
      'GET /api/me': ok(user),
    })
    const external = await renderWithProviders(<LoginPage />, {
      initialPath: '/?redirect=%2F%2Fevil.example',
    })

    await screen.findByLabelText('Email')
    fill('employee@opsflow.local', 'opsflow-dev-password')
    submit()

    await waitFor(() => expect(external.router.state.location.pathname).toBe('/'))
  })

  test('a session /api/me rejects is discarded rather than left behind', async () => {
    api = mockApi({
      [SIGN_IN]: { status: 200, body: { user: { id: 'u1' }, token: 't' } },
      'GET /api/me': fail('FORBIDDEN', 'This account is suspended', 403),
      [SIGN_OUT]: { status: 200, body: { success: true } },
    })
    const { router, queryClient } = await renderWithProviders(<LoginPage />)
    const removeQueries = spyOn(queryClient, 'removeQueries')

    await screen.findByLabelText('Email')
    fill('suspended@opsflow.local', 'opsflow-dev-password')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('This account is suspended')
    expect(api.calls.map((call) => call.path)).toEqual([
      '/api/auth/sign-in/email',
      '/api/me',
      '/api/auth/sign-out',
    ])
    expect(router.state.location.pathname).toBe('/')
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: currentUserQueryOptions.queryKey })
  })
})
