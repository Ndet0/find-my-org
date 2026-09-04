import { zValidator } from '@hono/zod-validator'
import { notificationListQuerySchema } from '@opsflow/types/notification'
import { z } from 'zod'
import { validateParam, validationError } from './zod.js'

export const validateNotificationListQuery = zValidator(
  'query',
  notificationListQuerySchema,
  (result) => {
    if (!result.success) {
      throw validationError(result.error)
    }
  },
)

export const validateNotificationIdParam = validateParam(
  z.object({ id: z.uuid('A notification id must be a UUID') }),
)
