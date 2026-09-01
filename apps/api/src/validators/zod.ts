import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'

/**
 * Reports a Zod failure through the standard error envelope.
 *
 * Without a hook, `zValidator` answers with its own response shape, which
 * clients would have to special-case alongside every other endpoint. The
 * flattened field errors go in `details` so a form can map them back onto
 * inputs.
 */
export function validationError<T>(error: z.core.$ZodError<T>): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    'The request could not be validated',
    422,
    z.flattenError(error).fieldErrors,
  )
}

export function validateJson<T extends z.ZodType>(schema: T) {
  return zValidator('json', schema, (result) => {
    if (!result.success) {
      throw validationError(result.error)
    }
  })
}

export function validateParam<T extends z.ZodType>(schema: T) {
  return zValidator('param', schema, (result) => {
    if (!result.success) {
      throw validationError(result.error)
    }
  })
}
