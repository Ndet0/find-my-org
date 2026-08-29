import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * Errors the service layer is allowed to throw. Anything else that
 * escapes a route is treated as an unexpected failure and reported
 * as a generic 500 (see middleware/error.ts).
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: ContentfulStatusCode = 400,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const notFound = (entity: string) =>
  new AppError(`${entity.toUpperCase()}_NOT_FOUND`, `${entity} could not be found`, 404)

export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError('FORBIDDEN', message, 403)

export const unauthorized = (message = 'Authentication required') =>
  new AppError('UNAUTHORIZED', message, 401)

export const conflict = (code: string, message: string) => new AppError(code, message, 409)
