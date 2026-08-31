import type { ApiResponse } from '@opsflow/types/api'
import { API_URL } from '@/lib/env'

/** A failure the API reported through the standard error envelope. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function isApiResponse<T>(body: unknown): body is ApiResponse<T> {
  return typeof body === 'object' && body !== null && 'success' in body
}

/**
 * Calls an OPSflow API route and unwraps the response envelope, so callers
 * work with the payload and catch failures instead of branching on
 * `success` everywhere.
 *
 * Endpoints under `/api/auth` are Better Auth's and do not use the
 * envelope — reach those through `authClient`, not this function.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    // The session cookie belongs to the API origin, so the browser only
    // attaches it to these cross-origin requests when credentials are
    // included. The API allows this with `cors({ credentials: true })`.
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
  })

  const body: unknown = await response.json().catch(() => null)

  if (!isApiResponse<T>(body)) {
    throw new ApiRequestError(
      'MALFORMED_RESPONSE',
      `The API returned an unreadable response (HTTP ${response.status})`,
      response.status,
    )
  }

  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, response.status)
  }

  return body.data
}
