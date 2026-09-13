import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import type { ClientDetail } from '@opsflow/types/client'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { fail, mockApi, ok } from '../../test/api-mock'
import { renderWithProviders, testQueryClient } from '../../test/render'
import { ClientForm } from './client-form'

/**
 * The form's two validation paths and what each does to the page. The local
 * path parses with the shared schema before any request; the server path is
 * a 422 envelope. Both must land on the field, which is what every other
 * form relies on `fieldErrorsFrom` for. See test/render.tsx for the rules.
 */

const detail = {
  id: 'c1',
  name: 'Acme',
  company: 'Acme Ltd',
  email: 'hello@acme.example',
  phone: null,
  status: 'active',
  projectCount: 2,
  address: null,
  notes: 'Prefers email',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies ClientDetail

let api: ReturnType<typeof mockApi> | undefined
let success: ReturnType<typeof spyOn<typeof toast, 'success'>> | undefined

afterEach(() => {
  api?.restore()
  success?.mockRestore()
})
afterEach(cleanup)

function input(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement
}

function type(label: string, value: string) {
  fireEvent.change(input(label), { target: { value } })
}

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: /add client|save changes/i }))
}

describe('ClientForm, creating', () => {
  test('a local validation failure lands on its field and sends nothing', async () => {
    api = mockApi({})
    renderWithProviders(<ClientForm />)

    await screen.findByLabelText('Name')
    submit()

    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toBe('Check the highlighted fields')
    expect(input('Name').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Enter a name')).toBeTruthy()
    expect(input('Email').getAttribute('aria-invalid')).toBe('false')
    expect(api.calls).toEqual([])
  })

  test('a 422 envelope lands on its field and the banner carries its message', async () => {
    api = mockApi({
      'POST /api/clients': fail('VALIDATION_ERROR', 'Check the form', 422, {
        email: ['Enter a valid email address'],
      }),
    })
    renderWithProviders(<ClientForm />)

    await screen.findByLabelText('Name')
    type('Name', 'Acme')
    type('Email', 'hello@acme.example')
    submit()

    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toBe('Check the form')
    expect(input('Email').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Enter a valid email address')).toBeTruthy()
    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]).toMatchObject({ method: 'POST', path: '/api/clients' })
  })

  test('a saved client is announced, the lists are invalidated and the page moves', async () => {
    api = mockApi({ 'POST /api/clients': ok(detail, 201) })
    success = spyOn(toast, 'success')
    const queryClient = testQueryClient()
    const invalidate = spyOn(queryClient, 'invalidateQueries')
    const { router } = renderWithProviders(<ClientForm />, { queryClient })

    await screen.findByLabelText('Name')
    type('Name', 'Acme')
    type('Company', 'Acme Ltd')
    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/clients/c1'))
    expect(success).toHaveBeenCalledWith('Acme was added')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['clients'] })
    // The schema runs before the request, so cleared fields arrive as null.
    expect(api.calls[0]?.body).toEqual({
      name: 'Acme',
      company: 'Acme Ltd',
      email: null,
      phone: null,
      address: null,
      notes: null,
    })
  })
})

describe('ClientForm, editing', () => {
  test('starts from the record and patches the whole payload', async () => {
    api = mockApi({ 'PATCH /api/clients/c1': ok({ ...detail, name: 'Acme Group' }) })
    success = spyOn(toast, 'success')
    const { router } = renderWithProviders(<ClientForm client={detail} />)

    await screen.findByLabelText('Name')
    expect(input('Name').value).toBe('Acme')
    expect(input('Company').value).toBe('Acme Ltd')
    expect(input('Notes').value).toBe('Prefers email')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()

    type('Name', 'Acme Group')
    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/clients/c1'))
    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]).toMatchObject({
      method: 'PATCH',
      path: '/api/clients/c1',
      body: { name: 'Acme Group', company: 'Acme Ltd', notes: 'Prefers email' },
    })
    expect(success).toHaveBeenCalledWith('Acme Group was updated')
  })

  test('cancel goes back without a request', async () => {
    api = mockApi({})
    const { router } = renderWithProviders(<ClientForm client={detail} />)
    const back = spyOn(router.history, 'back')

    await screen.findByLabelText('Name')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(back).toHaveBeenCalledTimes(1)
    expect(api.calls).toEqual([])
  })
})
