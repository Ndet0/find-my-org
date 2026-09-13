import type { ApiResponse } from '@opsflow/types/api'
import { Platform } from 'react-native'
import { authClient } from '@/lib/auth-client'
import { API_URL } from '@/lib/env'

import { ApiRequestError } from '@/lib/errors'

// The error shapes live in a module react-native never reaches, so they can
// be tested; every existing import of them from here still works.
export { ApiRequestError, type FieldErrorMap, fieldErrorsFrom } from '@/lib/errors'

function isApiResponse<T>(body: unknown): body is ApiResponse<T> {
  return typeof body === 'object' && body !== null && 'success' in body
}

/**
 * Calls an OPSflow API route and unwraps the response envelope. This is the
 * mobile twin of `apps/web/src/lib/api.ts`; the one difference is how the
 * session travels.
 *
 * In a browser the cookie jar sends it. On a device there is no jar, so the
 * cookie Better Auth's Expo plugin stored is attached by hand, and React
 * Native's own cookie handling is told to stay out of the way with
 * `credentials: 'omit'`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const native = Platform.OS !== 'web'
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')

  if (native) {
    const cookie = await authClient.getCookie()

    if (cookie) {
      headers.set('cookie', cookie)
    }
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers,
    credentials: native ? 'omit' : 'include',
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
    throw new ApiRequestError(
      body.error.code,
      body.error.message,
      response.status,
      body.error.details,
    )
  }

  return body.data
}
