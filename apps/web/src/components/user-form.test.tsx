import { afterEach, describe, expect, spyOn, test } from 'bun:test'
// The DOM must exist before anything renders; see test/setup.ts.
import '../../test/setup'
import type { UserDetail } from '@opsflow/types/user'
import { toast } from 'sonner'
import { mockApi, ok } from '../../test/api-mock'
import {
  cleanup,
  fireEvent,
  renderWithProviders,
  screen,
  testQueryClient,
  waitFor,
} from '../../test/render'

const { UserForm } = await import('./user-form')

/**
 * Editing sends only what changed. The API refuses a self-edit that carries
 * a role and records a role change for any role it is sent, so a form that
 * resent every field would 403 an admin fixing their own phone number and
 * pollute the trail for everyone else.
 */

const detail = {
  id: 'u1',
  name: 'Ada Admin',
  email: 'ada@opsflow.local',
  position: 'Operations Director',
  status: 'active',
  role: { id: 'r1', name: 'admin' },
  department: { id: 'd1', name: 'Management' },
  phone: null,
  avatarUrl: null,
  joinedAt: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies UserDetail

const departments = ok([{ id: 'd1', name: 'Management', description: null, memberCount: 1 }])

let api: ReturnType<typeof mockApi> | undefined
let spy: ReturnType<typeof spyOn<typeof toast, 'success' | 'info'>> | undefined

afterEach(() => {
  api?.restore()
  spy?.mockRestore()
})
afterEach(cleanup)

function input(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement
}

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }))
}

describe('UserForm, editing', () => {
  test('patches only the fields that changed, never an untouched role', async () => {
    api = mockApi({
      'GET /api/departments': departments,
      'PATCH /api/users/u1': ok({ ...detail, phone: '+1 555 0100' }),
    })
    spy = spyOn(toast, 'success')
    const { router } = await renderWithProviders(<UserForm user={detail} />)

    await screen.findByLabelText('Name')
    expect(input('Email').value).toBe('ada@opsflow.local')

    fireEvent.change(input('Phone'), { target: { value: '+1 555 0100' } })
    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/users/u1'))
    const patch = api.calls.find((call) => call.method === 'PATCH')
    expect(patch).toMatchObject({ path: '/api/users/u1', body: { phone: '+1 555 0100' } })
    expect(Object.keys(patch?.body as object)).toEqual(['phone'])
    expect(spy).toHaveBeenCalledWith('Ada Admin was updated')
  })

  test('an unchanged form sends nothing and still returns to the person', async () => {
    api = mockApi({ 'GET /api/departments': departments })
    spy = spyOn(toast, 'info')
    const queryClient = testQueryClient()
    const invalidate = spyOn(queryClient, 'invalidateQueries')
    const { router } = await renderWithProviders(<UserForm user={detail} />, { queryClient })

    await screen.findByLabelText('Name')
    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/users/u1'))
    expect(api.calls.filter((call) => call.method !== 'GET')).toEqual([])
    expect(invalidate).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('Nothing to save')
  })
})
