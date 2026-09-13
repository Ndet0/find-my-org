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

async function signIn(email: string, password = PASSWORD) {
  const response = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB_ORIGIN },
    body: JSON.stringify({ email, password }),
  })
  expect(response.status).toBe(200)

  return response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ')
}

/** Sign-in reduced to its status, for asserting that a password is refused. */
async function signInStatus(email: string, password: string) {
  const response = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB_ORIGIN },
    body: JSON.stringify({ email, password }),
  })

  return response.status
}

/**
 * Better Auth's own endpoint, which answers with its shape rather than the
 * OPSflow envelope `call` expects. `revokeOtherSessions` matches what the
 * mobile screen sends.
 */
async function changePassword(cookie: string, currentPassword: string, newPassword: string) {
  const response = await app.request('/api/auth/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB_ORIGIN, cookie },
    body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
  })

  return { status: response.status }
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

/** The ids on one page of a list response, in the order the API returned them. */
function ids(data: Record<string, unknown> | undefined) {
  return ((data?.items ?? []) as { id: string }[]).map((item) => item.id)
}

const created = { projectId: '', departmentId: '', lifecycleProjectId: '', openWorkProjectId: '' }

/** Notifications inserted straight through Prisma by the paging test. */
let tiedNotificationIds: string[] = []

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

/**
 * The seeded employee's password hash, captured before the change-password
 * test rewrites it. It is put back through Prisma rather than through the
 * API so the fixture is restored even if the test fails halfway, which would
 * otherwise leave every later sign-in in this file — and the dev database —
 * on a password nobody knows.
 */
let employeeCredential: { id: string; password: string | null } | null = null

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
  if (created.openWorkProjectId) {
    await prisma.task.deleteMany({ where: { projectId: created.openWorkProjectId } })
    await prisma.project.delete({ where: { id: created.openWorkProjectId } }).catch(() => undefined)
  }
  if (created.departmentId) {
    await prisma.department.delete({ where: { id: created.departmentId } }).catch(() => undefined)
  }
  if (employeeProfile) {
    const { id, ...original } = employeeProfile
    await prisma.user.update({ where: { id }, data: original }).catch(() => undefined)
  }
  if (employeeCredential) {
    const { id, password } = employeeCredential
    await prisma.account.update({ where: { id }, data: { password } }).catch(() => undefined)
  }
  if (tiedNotificationIds.length > 0) {
    await prisma.notification
      .deleteMany({ where: { id: { in: tiedNotificationIds } } })
      .catch(() => undefined)
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
  test('a person can edit their own name and phone', async () => {
    employeeProfile = await prisma.user.findUniqueOrThrow({
      where: { email: 'employee@opsflow.local' },
      select: { id: true, name: true, phone: true, position: true },
    })
    const employee = await signIn('employee@opsflow.local')

    const edited = await call('PATCH', '/api/me', employee, { phone: '+1 555 0100' })
    expect(edited.status).toBe(200)
    expect(edited.data?.phone).toBe('+1 555 0100')

    const me = await call('GET', '/api/me', employee)
    expect(me.data?.phone).toBe('+1 555 0100')

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

  test('a person changes their own password and the old one stops working', async () => {
    const NEW_PASSWORD = 'fixture-rotated-password'
    employeeCredential = await prisma.account.findFirstOrThrow({
      where: { user: { email: 'employee@opsflow.local' }, providerId: 'credential' },
      select: { id: true, password: true },
    })
    const employee = await signIn('employee@opsflow.local')

    // Changing a password is Better Auth's endpoint, not PATCH /api/me: it
    // owns the hash and is the only thing that can check the current
    // password before replacing it.
    const wrong = await changePassword(employee, 'not-the-current-password', NEW_PASSWORD)
    expect(wrong.status).toBe(400)

    const changed = await changePassword(employee, PASSWORD, NEW_PASSWORD)
    expect(changed.status).toBe(200)

    expect(await signInStatus('employee@opsflow.local', PASSWORD)).toBe(401)
    expect(await signInStatus('employee@opsflow.local', NEW_PASSWORD)).toBe(200)

    // Put it back through the API too, so the rest of the file signs in
    // normally; `afterAll` restores the hash if this line is never reached.
    const restored = await changePassword(
      await signIn('employee@opsflow.local', NEW_PASSWORD),
      NEW_PASSWORD,
      PASSWORD,
    )
    expect(restored.status).toBe(200)
  })

  test('a person cannot give themselves a position', async () => {
    const employee = await signIn('employee@opsflow.local')
    const before = await call('GET', '/api/me', employee)

    // Position is an administrator's field, so it is stripped like any other
    // key that is not in the schema — which leaves nothing to update.
    expect((await call('PATCH', '/api/me', employee, { position: 'Chief of Self' })).status).toBe(
      422,
    )

    // A body that is valid on its own still must not carry the position
    // through: the name changes, the position does not.
    const edited = await call('PATCH', '/api/me', employee, {
      name: 'Seeded Employee',
      position: 'Chief of Self',
    })
    expect(edited.status).toBe(200)
    expect(edited.data?.name).toBe('Seeded Employee')
    expect(edited.data?.position).toBe(before.data?.position ?? null)
  })
})

describe('dashboard and open work', () => {
  async function moveTask(cookie: string, taskId: unknown, statuses: string[]) {
    for (const status of statuses) {
      const moved = await call('PATCH', `/api/tasks/${taskId}/status`, cookie, { status })
      expect(moved.status).toBe(200)
    }
  }

  test('the open filter leaves completed tasks out, and an explicit status wins', async () => {
    const manager = await signIn('manager@opsflow.local')

    const project = await call('POST', '/api/projects', manager, {
      name: 'Open work fixture',
      priority: 'low',
    })
    expect(project.status).toBe(201)
    created.openWorkProjectId = project.data?.id as string

    const open = await call('POST', '/api/tasks', manager, {
      title: 'Open fixture task',
      projectId: created.openWorkProjectId,
    })
    const done = await call('POST', '/api/tasks', manager, {
      title: 'Completed fixture task',
      projectId: created.openWorkProjectId,
    })
    expect(open.status).toBe(201)
    expect(done.status).toBe(201)

    // Through `in_progress`: the lifecycle has no pending-to-completed edge.
    await moveTask(manager, done.data?.id, ['in_progress', 'completed'])

    const base = `/api/tasks?projectId=${created.openWorkProjectId}`

    const openOnly = await call('GET', `${base}&open=true`, manager)
    expect(openOnly.status).toBe(200)
    expect(ids(openOnly.data)).toEqual([open.data?.id as string])

    const narrowed = await call('GET', `${base}&open=true&status=completed`, manager)
    expect(narrowed.status).toBe(200)
    expect(ids(narrowed.data)).toEqual([done.data?.id as string])
  })

  test('the dashboard counts blocked tasks', async () => {
    const manager = await signIn('manager@opsflow.local')

    async function blockedCount() {
      const dashboard = await call('GET', '/api/dashboard', manager)
      expect(dashboard.status).toBe(200)
      return (dashboard.data as { tasks: { blocked: number } }).tasks.blocked
    }

    const task = await call('POST', '/api/tasks', manager, {
      title: 'Blocked fixture task',
      projectId: created.openWorkProjectId,
    })
    expect(task.status).toBe(201)

    const before = await blockedCount()
    // A task blocks from `in_progress`, never straight from `pending`.
    await moveTask(manager, task.data?.id, ['in_progress', 'blocked'])
    expect(await blockedCount()).toBe(before + 1)
  })
})

describe('list paging', () => {
  /**
   * The mobile lists concatenate pages, so a row must land on exactly one of
   * them. Offset paging only guarantees that over a total order, and the
   * notification list sorts by `createdAt` — which several rows can share.
   *
   * The ties are written through Prisma because the API cannot make them:
   * `createdAt` is microsecond-precise and the service creates notifications
   * one at a time. A marker in the title, searched with `q`, walks this group
   * alone and leaves the employee's real notifications out of it.
   *
   * What this proves and what it does not: without `id` in the `orderBy`,
   * nothing orders the tied rows, so they do not come back id-descending and
   * the final assertion fails. The four name- and date-ordered lists sort
   * ascending, where a tie's incidental order at this size tends to match the
   * fixed one, so a test there could pass either way; those lists carry the
   * same tiebreaker on correctness grounds, with no reproduction behind it.
   */
  test('a tie group pages out once each, in id order', async () => {
    const employee = await prisma.user.findUniqueOrThrow({
      where: { email: 'employee@opsflow.local' },
      select: { id: true },
    })
    const marker = `paging-fixture-${crypto.randomUUID()}`
    const createdAt = new Date()

    const rows = await prisma.notification.createManyAndReturn({
      data: Array.from({ length: 5 }, (_, index) => ({
        userId: employee.id,
        title: `${marker} ${index}`,
        message: 'Paging fixture',
        type: 'system' as const,
        createdAt,
      })),
      select: { id: true },
    })
    tiedNotificationIds = rows.map((row) => row.id)

    const cookie = await signIn('employee@opsflow.local')
    const walked: string[] = []
    let totalPages = 1

    for (let page = 1; page <= totalPages; page++) {
      const response = await call(
        'GET',
        `/api/notifications?q=${marker}&pageSize=2&page=${page}`,
        cookie,
      )
      expect(response.status).toBe(200)
      expect(response.data?.total).toBe(5)
      totalPages = response.data?.totalPages as number
      walked.push(...ids(response.data))
    }

    expect(totalPages).toBe(3)
    // Every row once: none repeated across a boundary, none skipped.
    expect(new Set(walked).size).toBe(walked.length)
    expect([...walked].sort()).toEqual([...tiedNotificationIds].sort())
    // In the order the tiebreaker defines. uuid(7) strings sort as the database
    // compares the column, so a string sort is the expected order.
    expect(walked).toEqual([...tiedNotificationIds].sort().reverse())
  })
})
