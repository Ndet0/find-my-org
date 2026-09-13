import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { z } from 'zod'
import { ApiRequestError, apiFetch, fieldErrorsFrom, formErrorMessage } from './api'

const API_URL = process.env.VITE_API_URL

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('apiFetch', () => {
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>> | undefined

  afterEach(() => {
    fetchSpy?.mockRestore()
  })

  test('unwraps a success envelope and sends the session with every call', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ success: true, data: { id: 'task-1' } }),
    )

    const data = await apiFetch<{ id: string }>('/tasks/task-1', {
      headers: { 'x-caller': 'test' },
    })

    expect(data).toEqual({ id: 'task-1' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe(`${API_URL}/api/tasks/task-1`)
    expect(init).toMatchObject({
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-caller': 'test' },
    })
  })

  test('turns an error envelope into an ApiRequestError carrying its details', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the form',
            details: { name: ['Enter a name'] },
          },
        },
        422,
      ),
    )

    const failure = await apiFetch('/tasks', { method: 'POST' }).catch((error) => error)

    expect(failure).toBeInstanceOf(ApiRequestError)
    expect(failure).toBeInstanceOf(Error)
    expect(failure).toMatchObject({
      name: 'ApiRequestError',
      code: 'VALIDATION_ERROR',
      message: 'Check the form',
      status: 422,
      details: { name: ['Enter a name'] },
    })
  })

  test('reports a body that is not an envelope as MALFORMED_RESPONSE', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Bad gateway</html>', { status: 502 }),
    )

    const failure = await apiFetch('/tasks').catch((error) => error)

    expect(failure).toMatchObject({ code: 'MALFORMED_RESPONSE', status: 502 })
    expect((failure as Error).message).toContain('HTTP 502')
  })

  test.each([{}, null])('JSON without a success flag (%j) is malformed too', async (body) => {
    // Better Auth's endpoints answer in their own shape; a caller that reaches
    // one through apiFetch by mistake gets this rather than a silent undefined.
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(json(body))

    const failure = await apiFetch('/auth/session').catch((error) => error)

    expect(failure).toMatchObject({ code: 'MALFORMED_RESPONSE', status: 200 })
  })

  test('a request that never reached the API is not an ApiRequestError', async () => {
    const network = new TypeError('Failed to fetch')
    fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(network)

    const failure = await apiFetch('/tasks').catch((error) => error)

    // Callers tell "the API said no" from "the API was not reached" by type.
    expect(failure).toBe(network)
    expect(failure).not.toBeInstanceOf(ApiRequestError)
  })
})

describe('fieldErrorsFrom', () => {
  test('flattens a local ZodError onto its fields', () => {
    const result = z.object({ name: z.string().min(1, 'Enter a name') }).safeParse({ name: '' })

    expect(fieldErrorsFrom(result.error)).toEqual({ name: ['Enter a name'] })
  })

  test('keeps only the string arrays from an envelope', () => {
    const error = new ApiRequestError('VALIDATION_ERROR', 'Check the form', 422, {
      name: ['Enter a name'],
      mixed: ['a', 1],
      count: 'not an array',
    })

    expect(fieldErrorsFrom(error)).toEqual({ name: ['Enter a name'] })
  })

  test.each([undefined, null, 'string', ['a']])('details of %j map to nothing', (details) => {
    expect(fieldErrorsFrom(new ApiRequestError('X', 'x', 400, details))).toEqual({})
  })

  test('anything that is not a validation failure maps to nothing', () => {
    expect(fieldErrorsFrom(new Error('boom'))).toEqual({})
    expect(fieldErrorsFrom(undefined)).toEqual({})
  })
})

describe('formErrorMessage', () => {
  test('a ZodError points at the fields, an envelope speaks for itself, else the fallback', () => {
    const zod = z.object({ name: z.string().min(1) }).safeParse({ name: '' }).error

    expect(formErrorMessage(zod, 'fallback')).toBe('Check the highlighted fields')
    expect(formErrorMessage(new ApiRequestError('X', 'Nope', 409), 'fallback')).toBe('Nope')
    expect(formErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
    expect(formErrorMessage(undefined, 'fallback')).toBe('fallback')
  })
})
