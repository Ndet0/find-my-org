import { zValidator } from '@hono/zod-validator'
import {
  createDmConversationSchema,
  dmContactsQuerySchema,
  dmKeySchema,
  dmMessageListQuerySchema,
  sendDmMessageSchema,
} from '@opsflow/types/dm'
import { z } from 'zod'
import { validateJson, validateParam, validationError } from './zod.js'

const query = <T extends z.ZodType>(schema: T) =>
  zValidator('query', schema, (result) => {
    if (!result.success) {
      throw validationError(result.error)
    }
  })

export const validateDmKey = validateJson(dmKeySchema)
export const validateDmContactsQuery = query(dmContactsQuerySchema)
export const validateDmMessageListQuery = query(dmMessageListQuerySchema)
export const validateCreateDmConversation = validateJson(createDmConversationSchema)
export const validateSendDmMessage = validateJson(sendDmMessageSchema)

export const validateDmConversationIdParam = validateParam(
  z.object({ id: z.uuid('A conversation id must be a UUID') }),
)
