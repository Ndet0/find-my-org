import { afterAll, describe, expect, test } from 'bun:test'
import { prisma } from '@opsflow/db'
import { app } from '../src/app'

/**
 * Business rules that span two records, exercised end to end through the
 * API on the seeded development database. Every row these create is
 * removed again in `afterAll`, so the fixture does not accumulate.
 */

const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'opsflow-dev-password'
const WEB_ORIGIN = process.env.WEB_URL ?? 'http://localhost:5173'

async function signIn(email: string) {
  const response = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB_ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  expect(response.status).toBe(200)

  return response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ')
}

async function call(method: string, path: string, cookie: string, body?: unknown) {
  const response = await app.request(path, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await response.json()) as {
    success: boolean
    data?: Record<string, unknown>
    error?: { code: string }
  }

  return { status: response.status, ...json }
}

const created = { projectId: '', departmentId: '', lifecycleProjectId: '' }

/**
 * The seeded employee is a shared fixture, so the profile test records the
 * original values and puts them back rather than deleting anything.
 */
let employeeProfile: {
  id: string
  name: string
  phone: string | null
  position: string | null
} | null = null

afterAll(async () => {
  if (created.projectId) {
    await prisma.task.deleteMany({ where: { projectId: created.projectId } })
    await prisma.project.delete({ where: { id: created.projectId } }).catch(() => undefined)
  }
  if (created.lifecycleProjectId) {
    await prisma.task.deleteMany({ where: { projectId: created.lifecycleProjectId } })
    await prisma.project
      .delete({ where: { id: created.lifecycleProjectId } })
      .catch(() => undefined)
  }
  if (created.departmentId) {
    await prisma.department.delete({ where: { id: created.departmentId } }).catch(() => undefined)
  }
  if (employeeProfile) {
    const { id, ...original } = employeeProfile
    await prisma.user.update({ where: { id }, data: original }).catch(() => undefined)
  }
})

describe('assignment rules', () => {
  test('a member with open work cannot be removed until it is reassigned', async () => {
    const manager = await signIn('manager@opsflow.local')
    const employee = await prisma.user.findUniqueOrThrow({
      where: { email: 'employee@opsflow.local' },
      select: { id: true },
    })

    const project = await call('POST', '/api/projects', manager, {
      name: 'Audit rules fixture',
      priority: 'low',
    })
    expect(project.status).toBe(201)
    created.projectId = project.data?.id as string

    const added = await call('POST', `/api/projects/${created.projectId}/members`, manager, {
      userId: employee.id,
    })
    expect(added.status).toBe(201)

    const task = await call('POST', '/api/tasks', manager, {
      title: 'Fixture task',
      projectId: created.projectId,
      assignedTo: employee.id,
    })
    expect(task.status).toBe(201)

    const blocked = await call(
      'DELETE',
      `/api/projects/${created.projectId}/members/${employee.id}`,
      manager,
    )
    expect(blocked.status).toBe(409)
    expect(blocked.error?.code).toBe('ASSIGNEE_HAS_OPEN_TASKS')

    // Through `in_progress`: the lifecycle has no pending-to-completed edge.
    const started = await call('PATCH', `/api/tasks/${task.data?.id}/status`, manager, {
      status: 'in_progress',
    })
    expect(started.status).toBe(200)

    const completed = await call('PATCH', `/api/tasks/${task.data?.id}/status`, manager, {
      status: 'completed',
    })
    expect(completed.status).toBe(200)

    const removed = await call(
      'DELETE',
      `/api/projects/${created.projectId}/members/${employee.id}`,
      manager,
    )
    expect(removed.status).toBe(200)
  })

  test('a closed project stops accepting tasks', async () => {
    const manager = await signIn('manager@opsflow.local')

    const cancelled = await call('PATCH', `/api/projects/${created.projectId}/status`, manager, {
      status: 'cancelled',
    })
    expect(cancelled.status).toBe(200)

    const task = await call('POST', '/api/tasks', manager, {
      title: 'Too late',
      projectId: created.projectId,
    })
    expect(task.status).toBe(409)
    expect(task.error?.code).toBe('PROJECT_CLOSED')
  })
})

describe('lifecycle rules', () => {
  test('a project walks its lifecycle and refuses the moves that skip it', async () => {
    const manager = await signIn('manager@opsflow.local')

    const project = await call('POST', '/api/projects', manager, {
      name: 'Lifecycle rules fixture',
      priority: 'low',
    })
    expect(project.status).toBe(201)
    created.lifecycleProjectId = project.data?.id as string
    expect(project.data?.status).toBe('planning')

    const path = `/api/projects/${created.lifecycleProjectId}/status`

    // Planning goes to active or straight to cancelled; it cannot complete
    // work that never started, nor be put on hold before it began.
    const skipped = await call('PATCH', path, manager, { status: 'completed' })
    expect(skipped.status).toBe(409)
    expect(skipped.error?.code).toBe('INVALID_PROJECT_TRANSITION')
    expect((await call('PATCH', path, manager, { status: 'on_hold' })).status).toBe(409)

    const unchanged = await call('PATCH', path, manager, { status: 'planning' })
    expect(unchanged.status).toBe(409)
    expect(unchanged.error?.code).toBe('PROJECT_STATUS_UNCHANGED')

    expect((await call('PATCH', path, manager, { status: 'active' })).status).toBe(200)
    expect((await call('PATCH', path, manager, { status: 'on_hold' })).status).toBe(200)

    // On hold resumes through active; it cannot complete from there.
    expect((await call('PATCH', path, manager, { status: 'completed' })).status).toBe(409)
    expect((await call('PATCH', path, manager, { status: 'active' })).status).toBe(200)

    const completed = await call('PATCH', path, manager, { status: 'completed' })
    expect(completed.status).toBe(200)
    // Completion settles the progress figure the dashboard averages.
    expect(completed.data?.progress).toBe(100)

    // A completed project reopens, because completion is a claim that can
    // be wrong. Cancellation is a decision, so it is the terminal state.
    expect((await call('PATCH', path, manager, { status: 'active' })).status).toBe(200)
    expect((await call('PATCH', path, manager, { status: 'cancelled' })).status).toBe(200)

    const revived = await call('PATCH', path, manager, { status: 'active' })
    expect(revived.status).toBe(409)
    expect(revived.error?.code).toBe('INVALID_PROJECT_TRANSITION')
  })

  test('a task walks its lifecycle and refuses the moves that skip it', async () => {
    const manager = await signIn('manager@opsflow.local')
    const employee = await prisma.user.findUniqueOrThrow({
      where: { email: 'employee@opsflow.local' },
      select: { id: true },
    })

    const project = await prisma.project.create({
      data: { name: 'Task lifecycle fixture', status: 'active' },
      select: { id: true },
    })
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: employee.id },
    })

    const task = await call('POST', '/api/tasks', manager, {
      title: 'Lifecycle task',
      projectId: project.id,
      assignedTo: employee.id,
    })
    expect(task.status).toBe(201)
    const path = `/api/tasks/${task.data?.id}/status`
    expect(task.data?.status).toBe('pending')

    const assignee = await signIn('employee@opsflow.local')

    // Pending cannot jump the work: neither straight to done nor to blocked.
    const jumped = await call('PATCH', path, assignee, { status: 'completed' })
    expect(jumped.status).toBe(409)
    expect(jumped.error?.code).toBe('INVALID_TASK_TRANSITION')
    expect((await call('PATCH', path, assignee, { status: 'blocked' })).status).toBe(409)

    const unchanged = await call('PATCH', path, assignee, { status: 'pending' })
    expect(unchanged.status).toBe(409)
    expect(unchanged.error?.code).toBe('TASK_STATUS_UNCHANGED')

    expect((await call('PATCH', path, assignee, { status: 'in_progress' })).status).toBe(200)
    expect((await call('PATCH', path, assignee, { status: 'blocked' })).status).toBe(200)

    // Blocked resumes through in progress; it cannot complete from there.
    expect((await call('PATCH', path, assignee, { status: 'completed' })).status).toBe(409)
    expect((await call('PATCH', path, assignee, { status: 'in_progress' })).status).toBe(200)

    const done = await call('PATCH', path, assignee, { status: 'completed' })
    expect(done.status).toBe(200)
    expect(done.data?.completedAt).not.toBeNull()

    // Reopening clears the completion time rather than leaving a stale one.
    const reopened = await call('PATCH', path, assignee, { status: 'in_progress' })
    expect(reopened.status).toBe(200)
    expect(reopened.data?.completedAt).toBeNull()

    await prisma.task.deleteMany({ where: { projectId: project.id } })
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
    await prisma.project.delete({ where: { id: project.id } })
  })
})

describe('audit trail', () => {
  test('editing a record writes an activity row', async () => {
    const admin = await signIn('admin@opsflow.local')

    const department = await call('POST', '/api/departments', admin, {
      name: 'Audit fixture department',
    })
    expect(department.status).toBe(201)
    created.departmentId = department.data?.id as string

    const edited = await call('PATCH', `/api/departments/${created.departmentId}`, admin, {
      description: 'Renamed by the test suite',
    })
    expect(edited.status).toBe(200)

    const activity = await call(
      'GET',
      `/api/activity?entityType=department&entityId=${created.departmentId}`,
      admin,
    )
    expect(activity.status).toBe(200)
    const items = (activity.data?.items ?? []) as { action: string }[]
    const actions = items.map((item) => item.action)
    expect(actions).toContain('updated')
    expect(actions).toContain('created')
  })
})

describe('self-service profile', () => {
  test('a person can edit their own name, position and phone', async () => {
    employeeProfile = await prisma.user.findUniqueOrThrow({
      where: { email: 'employee@opsflow.local' },
      select: { id: true, name: true, phone: true, position: true },
    })
    const employee = await signIn('employee@opsflow.local')

    const edited = await call('PATCH', '/api/me', employee, {
      phone: '+1 555 0100',
      position: 'Fixture position',
    })
    expect(edited.status).toBe(200)
    expect(edited.data?.phone).toBe('+1 555 0100')
    expect(edited.data?.position).toBe('Fixture position')

    const me = await call('GET', '/api/me', employee)
    expect(me.data?.phone).toBe('+1 555 0100')
    expect(me.data?.position).toBe('Fixture position')

    // Employees see their own actions in the trail.
    const activity = await call(
      'GET',
      `/api/activity?entityType=user&entityId=${employeeProfile.id}`,
      employee,
    )
    const actions = ((activity.data?.items ?? []) as { action: string }[]).map((i) => i.action)
    expect(actions).toContain('updated')
  })

  test('the profile endpoint rejects empty, invalid and out-of-scope bodies', async () => {
    const employee = await signIn('employee@opsflow.local')
    const before = await call('GET', '/api/me', employee)
    const role = (before.data?.role as { name: string } | undefined)?.name
    expect(role).toBeDefined()

    expect((await call('PATCH', '/api/me', employee, {})).status).toBe(422)

    const blank = await call('PATCH', '/api/me', employee, { name: '' })
    expect(blank.status).toBe(422)
    expect(blank.error?.code).toBe('VALIDATION_ERROR')

    // Unknown keys are stripped, which leaves nothing to update; the role
    // is untouched either way.
    expect((await call('PATCH', '/api/me', employee, { role: 'admin' })).status).toBe(422)
    const after = await call('GET', '/api/me', employee)
    expect((after.data?.role as { name: string } | undefined)?.name).toBe(role)
  })
})
