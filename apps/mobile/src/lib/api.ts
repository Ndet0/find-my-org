import type { ApiResponse } from '@opsflow/types/api'
import { Platform } from 'react-native'
import { authClient } from '@/lib/auth-client'
import { API_URL } from '@/lib/env'

/** Flattened field errors from a `VALIDATION_ERROR` envelope. */
export type FieldErrorMap = Record<string, string[] | undefined>

/** A failure the API reported through the standard error envelope. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

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

/** Maps a 422 envelope back onto form fields. Anything else is empty. */
export function fieldErrorsFrom(error: unknown): FieldErrorMap {
  if (
    !(error instanceof ApiRequestError) ||
    error.details === undefined ||
    error.details === null
  ) {
    return {}
  }

  if (typeof error.details !== 'object' || Array.isArray(error.details)) {
    return {}
  }

  const mapped: FieldErrorMap = {}

  for (const [key, value] of Object.entries(error.details)) {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      mapped[key] = value
    }
  }

  return mapped
}
