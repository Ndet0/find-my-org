import { zValidator } from '@hono/zod-validator'
import { commentListQuerySchema, createCommentSchema } from '@opsflow/types/comment'
import { z } from 'zod'
import { validateJson, validateParam, validationError } from './zod.js'

export const validateCommentListQuery = zValidator('query', commentListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})

export const validateCreateComment = validateJson(createCommentSchema)

export const validateCommentIdParam = validateParam(
  z.object({ id: z.uuid('A comment id must be a UUID') }),
)
