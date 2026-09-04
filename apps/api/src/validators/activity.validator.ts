import { zValidator } from '@hono/zod-validator'
import { activityListQuerySchema } from '@opsflow/types/activity'
import { validationError } from './zod.js'

export const validateActivityListQuery = zValidator('query', activityListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})
