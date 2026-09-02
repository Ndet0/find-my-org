import { zValidator } from '@hono/zod-validator'
import {
  clientListQuerySchema,
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
} from '@opsflow/types/client'
import { z } from 'zod'
import { validateJson, validateParam, validationError } from './zod.js'

export const validateClientListQuery = zValidator('query', clientListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})

export const validateClientIdParam = validateParam(
  z.object({ id: z.uuid('A client id must be a UUID') }),
)

export const validateCreateClient = validateJson(createClientSchema)

export const validateUpdateClient = validateJson(updateClientSchema)

export const validateUpdateClientStatus = validateJson(updateClientStatusSchema)
