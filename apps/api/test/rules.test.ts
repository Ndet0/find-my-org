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

const created = { projectId: '', departmentId: '' }

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
