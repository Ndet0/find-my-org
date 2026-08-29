import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { isProduction } from '../lib/env.js'
import { AppError } from '../lib/errors.js'
import { fail } from '../lib/response.js'

/**
 * Centralised error handling. Known failures keep their code and
 * status; anything unexpected is logged in full server-side and
 * reduced to a generic message for the client, so stack traces and
 * database internals never reach the browser.
 */
export function onError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return fail(c, err.code, err.message, err.status, err.details)
  }

  if (err instanceof HTTPException) {
    return fail(c, 'HTTP_ERROR', err.message, err.status)
  }

  console.error('[unhandled]', err)

  return fail(
    c,
    'INTERNAL_SERVER_ERROR',
    isProduction ? 'An unexpected error occurred' : err.message,
    500,
  )
}

export function onNotFound(c: Context) {
  return fail(c, 'ROUTE_NOT_FOUND', `No route matches ${c.req.method} ${c.req.path}`, 404)
}
