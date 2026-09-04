import { Hono } from 'hono'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  setTaskPriority,
  setTaskStatus,
  updateTask,
} from '../services/task.service.js'
import {
  validateCreateTask,
  validateTaskIdParam,
  validateTaskListQuery,
  validateUpdateTask,
  validateUpdateTaskPriority,
  validateUpdateTaskStatus,
} from '../validators/task.validator.js'

export const taskRoutes = new Hono<AppEnv>()

taskRoutes.use('*', requireAuth, requirePermission('tasks:read'))

taskRoutes.get('/', validateTaskListQuery, async (c) => {
  return ok(c, await listTasks(c.req.valid('query'), { id: c.get('user').id, role: c.get('role') }))
})

taskRoutes.post('/', requirePermission('tasks:write'), validateCreateTask, async (c) => {
  return ok(
    c,
    await createTask(c.req.valid('json'), { id: c.get('user').id, role: c.get('role') }),
    201,
  )
})

taskRoutes.get('/:id', validateTaskIdParam, async (c) => {
  return ok(
    c,
    await getTask(c.req.valid('param').id, { id: c.get('user').id, role: c.get('role') }),
  )
})

taskRoutes.patch('/:id/status', validateTaskIdParam, validateUpdateTaskStatus, async (c) => {
  return ok(
    c,
    await setTaskStatus(c.req.valid('param').id, c.req.valid('json').status, {
      id: c.get('user').id,
      role: c.get('role'),
    }),
  )
})

taskRoutes.patch(
  '/:id/priority',
  requirePermission('tasks:write'),
  validateTaskIdParam,
  validateUpdateTaskPriority,
  async (c) => {
    return ok(
      c,
      await setTaskPriority(c.req.valid('param').id, c.req.valid('json').priority, {
        id: c.get('user').id,
        role: c.get('role'),
      }),
    )
  },
)

taskRoutes.delete('/:id', requirePermission('tasks:write'), validateTaskIdParam, async (c) => {
  return ok(
    c,
    await deleteTask(c.req.valid('param').id, { id: c.get('user').id, role: c.get('role') }),
  )
})

taskRoutes.patch(
  '/:id',
  requirePermission('tasks:write'),
  validateTaskIdParam,
  validateUpdateTask,
  async (c) => {
    return ok(
      c,
      await updateTask(c.req.valid('param').id, c.req.valid('json'), {
        id: c.get('user').id,
        role: c.get('role'),
      }),
    )
  },
)
