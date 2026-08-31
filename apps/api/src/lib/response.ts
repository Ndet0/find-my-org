import type { ApiError, ApiSuccess } from '@opsflow/types/api'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * Helpers for the response envelope defined in `@opsflow/types/api`.
 * Every route returns one of the two shapes so web and mobile can share
 * a single client-side unwrapping function.
 */
export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<ApiSuccess<T>>({ success: true, data }, status)
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown,
) {
  return c.json<ApiError>({ success: false, error: { code, message, details } }, status)
}
