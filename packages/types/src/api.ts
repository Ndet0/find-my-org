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

/**
 * The shape every list endpoint returns inside `data`, so a paginated
 * response is still one envelope and `apiFetch` needs no special case.
 *
 * Offset rather than cursor: these back administrative tables that show a
 * total and let the user jump to a page, and no OPSflow entity reaches the
 * row counts at which offset paging becomes the bottleneck.
 */
export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 25

/** Bounded so a caller cannot ask for the entire table in one request. */
export const MAX_PAGE_SIZE = 100
