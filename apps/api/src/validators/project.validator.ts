import { zValidator } from '@hono/zod-validator'
import {
  addProjectMemberSchema,
  createProjectSchema,
  projectListQuerySchema,
  updateProjectPrioritySchema,
  updateProjectSchema,
  updateProjectStatusSchema,
} from '@opsflow/types/project'
import { z } from 'zod'
import { validateJson, validateParam, validationError } from './zod.js'

export const validateProjectListQuery = zValidator('query', projectListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})

export const validateProjectIdParam = validateParam(
  z.object({ id: z.uuid('A project id must be a UUID') }),
)

export const validateProjectMemberParam = validateParam(
  z.object({
    id: z.uuid('A project id must be a UUID'),
    userId: z.uuid('A user id must be a UUID'),
  }),
)

export const validateCreateProject = validateJson(createProjectSchema)

export const validateUpdateProject = validateJson(updateProjectSchema)

export const validateUpdateProjectStatus = validateJson(updateProjectStatusSchema)

export const validateUpdateProjectPriority = validateJson(updateProjectPrioritySchema)

export const validateAddProjectMember = validateJson(addProjectMemberSchema)
