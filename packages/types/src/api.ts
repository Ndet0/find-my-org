/**
 * The response envelope defined in docs/technical_architecture.md §27.
 *
 * This lives in `@opsflow/types` rather than in the API so that web and
 * mobile can unwrap every endpoint through one shared shape without
 * importing `@opsflow/db`, which would pull the Prisma client into the
 * browser bundle.
 */
export type ApiSuccess<T> = { success: true; data: T }

export type ApiError = {
  success: false
  error: { code: string; message: string; details?: unknown }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
