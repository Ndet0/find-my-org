import type { ApiResponse } from '@opsflow/types/api'
import { z } from 'zod'
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
    throw new ApiRequestError(
      body.error.code,
      body.error.message,
      response.status,
      body.error.details,
    )
  }

  return body.data
}

/**
 * Maps a validation failure back onto form fields. Forms parse their payload
 * with the shared Zod schema before sending it, so the failure can be a
 * ZodError raised locally or a 422 envelope from the API; both carry the
 * same flattened shape. Anything else is empty.
 */
export function fieldErrorsFrom(error: unknown): FieldErrorMap {
  if (error instanceof z.ZodError) {
    return z.flattenError(error).fieldErrors as FieldErrorMap
  }

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

/** The banner above a form: what went wrong, in one line. */
export function formErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return 'Check the highlighted fields'
  }

  return error instanceof ApiRequestError ? error.message : fallback
}
