import { zValidator } from '@hono/zod-validator'
import { userListQuerySchema } from '@opsflow/types/user'
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
function validationError<T>(error: z.core.$ZodError<T>): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    'The request could not be validated',
    422,
    z.flattenError(error).fieldErrors,
  )
}

export const validateUserListQuery = zValidator('query', userListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})

export const validateUserIdParam = zValidator(
  'param',
  z.object({ id: z.uuid('A user id must be a UUID') }),
  (result) => {
    if (!result.success) {
      throw validationError(result.error)
    }
  },
)
