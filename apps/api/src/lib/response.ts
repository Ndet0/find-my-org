import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * The response envelope defined in docs/technical_architecture.md §27.
 * Every route returns one of these two shapes so web and mobile can
 * share a single client-side unwrapping function.
 */
export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = {
  success: false
  error: { code: string; message: string; details?: unknown }
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError

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
