import { zValidator } from '@hono/zod-validator'
import {
  createTaskSchema,
  taskListQuerySchema,
  updateTaskPrioritySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '@opsflow/types/task'
import { z } from 'zod'
import { validateJson, validateParam, validationError } from './zod.js'

export const validateTaskListQuery = zValidator('query', taskListQuerySchema, (result) => {
  if (!result.success) {
    throw validationError(result.error)
  }
})

export const validateTaskIdParam = validateParam(
  z.object({ id: z.uuid('A task id must be a UUID') }),
)

export const validateCreateTask = validateJson(createTaskSchema)

export const validateUpdateTask = validateJson(updateTaskSchema)

export const validateUpdateTaskStatus = validateJson(updateTaskStatusSchema)

export const validateUpdateTaskPriority = validateJson(updateTaskPrioritySchema)
