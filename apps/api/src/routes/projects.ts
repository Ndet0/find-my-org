import { Hono } from 'hono'
import { eventActor } from '../lib/actor.js'
import type { AppEnv } from '../lib/context.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permission.js'
import {
  addProjectMember,
  createProject,
  getProject,
  listProjects,
  removeProjectMember,
  setProjectPriority,
  setProjectStatus,
  updateProject,
} from '../services/project.service.js'
import {
  validateAddProjectMember,
  validateCreateProject,
  validateProjectIdParam,
  validateProjectListQuery,
  validateProjectMemberParam,
  validateUpdateProject,
  validateUpdateProjectPriority,
  validateUpdateProjectStatus,
} from '../validators/project.validator.js'

export const projectRoutes = new Hono<AppEnv>()

projectRoutes.use('*', requireAuth, requirePermission('projects:read'))

projectRoutes.get('/', validateProjectListQuery, async (c) => {
  return ok(
    c,
    await listProjects(c.req.valid('query'), { id: c.get('user').id, role: c.get('role') }),
  )
})

projectRoutes.post('/', requirePermission('projects:write'), validateCreateProject, async (c) => {
  return ok(c, await createProject(c.req.valid('json'), eventActor(c)), 201)
})

projectRoutes.get('/:id', validateProjectIdParam, async (c) => {
  return ok(
    c,
    await getProject(c.req.valid('param').id, { id: c.get('user').id, role: c.get('role') }),
  )
})

projectRoutes.patch(
  '/:id/status',
  requirePermission('projects:write'),
  validateProjectIdParam,
  validateUpdateProjectStatus,
  async (c) => {
    return ok(
      c,
      await setProjectStatus(c.req.valid('param').id, c.req.valid('json').status, eventActor(c)),
    )
  },
)

projectRoutes.patch(
  '/:id/priority',
  requirePermission('projects:write'),
  validateProjectIdParam,
  validateUpdateProjectPriority,
  async (c) => {
    return ok(
      c,
      await setProjectPriority(
        c.req.valid('param').id,
        c.req.valid('json').priority,
        eventActor(c),
      ),
    )
  },
)

projectRoutes.post(
  '/:id/members',
  requirePermission('projects:write'),
  validateProjectIdParam,
  validateAddProjectMember,
  async (c) => {
    return ok(
      c,
      await addProjectMember(c.req.valid('param').id, c.req.valid('json'), eventActor(c)),
      201,
    )
  },
)

projectRoutes.delete(
  '/:id/members/:userId',
  requirePermission('projects:write'),
  validateProjectMemberParam,
  async (c) => {
    const { id, userId } = c.req.valid('param')
    return ok(c, await removeProjectMember(id, userId, eventActor(c)))
  },
)

projectRoutes.patch(
  '/:id',
  requirePermission('projects:write'),
  validateProjectIdParam,
  validateUpdateProject,
  async (c) => {
    return ok(c, await updateProject(c.req.valid('param').id, c.req.valid('json'), eventActor(c)))
  },
)
