import { createDepartmentSchema, updateDepartmentSchema } from '@opsflow/types/department'
import { z } from 'zod'
import { validateJson, validateParam } from './zod.js'

export const validateDepartmentIdParam = validateParam(
  z.object({ id: z.uuid('A department id must be a UUID') }),
)

export const validateCreateDepartment = validateJson(createDepartmentSchema)

export const validateUpdateDepartment = validateJson(updateDepartmentSchema)
