import { zValidator } from '@hono/zod-validator'
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userListQuerySchema,
} from '@opsflow/types/user'
import { z } from 'zod'
import { validateJson, validateParam, validationError } from './zod.js'

export const validateUserListQuery = zValidator('query', userListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})

export const validateUserIdParam = validateParam(
  z.object({ id: z.uuid('A user id must be a UUID') }),
)

export const validateCreateUser = validateJson(createUserSchema)

export const validateUpdateUser = validateJson(updateUserSchema)

export const validateUpdateUserStatus = validateJson(updateUserStatusSchema)
