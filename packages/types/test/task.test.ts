import { describe, expect, test } from 'bun:test'
import {
  canTransitionTask,
  createTaskSchema,
  nextTaskStatuses,
  TASK_STATUSES,
  type TaskStatus,
  taskListQuerySchema,
  taskStatusText,
  updateTaskPrioritySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../src/task'

const UUID = '01a057c2-6a1f-7512-84e4-a4205576ff78'

/**
 * The task lifecycle from docs/product_architecture.md §21 plus the two
 * recoveries recorded in sprint.md, restated as a literal. Every pair is
 * checked, so a widened or narrowed table fails here before it reaches a
 * status control.
 */
const ALLOWED: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['pending', 'blocked', 'completed'],
  blocked: ['in_progress'],
  completed: ['in_progress'],
}

describe('task transitions', () => {
  const pairs = TASK_STATUSES.flatMap((from) => TASK_STATUSES.map((to) => [from, to] as const))

  test.each(pairs)('%s → %s', (from, to) => {
    expect(canTransitionTask(from, to)).toBe(ALLOWED[from].includes(to))
  })

  test.each([...TASK_STATUSES])('nextTaskStatuses(%s) offers the documented moves only', (from) => {
    expect(nextTaskStatuses(from)).toEqual(ALLOWED[from])
    expect(nextTaskStatuses(from)).not.toContain(from)
  })

  test('skipping the work is closed in both directions', () => {
    expect(canTransitionTask('pending', 'completed')).toBe(false)
    expect(canTransitionTask('pending', 'blocked')).toBe(false)
    expect(canTransitionTask('blocked', 'completed')).toBe(false)
  })

  test('the two recoveries are open', () => {
    expect(canTransitionTask('in_progress', 'pending')).toBe(true)
    expect(canTransitionTask('completed', 'in_progress')).toBe(true)
  })

  test('taskStatusText reads the underscore as a space', () => {
    expect(taskStatusText('in_progress')).toBe('in progress')
    expect(taskStatusText('pending')).toBe('pending')
  })
})

describe('taskListQuerySchema', () => {
  test.each(['overdue', 'open'] as const)(
    '%s is false unless the string "true" is sent',
    (flag) => {
      expect(taskListQuerySchema.parse({})[flag]).toBe(false)
      expect(taskListQuerySchema.parse({ [flag]: 'true' })[flag]).toBe(true)
    },
  )

  // `toSearchParams` omits a false flag rather than sending "false", so the
  // schema only knows one spelling. Anything else is a malformed URL.
  test.each(['false', '1', ''])('a flag spelled %j is rejected', (value) => {
    expect(taskListQuerySchema.safeParse({ open: value }).success).toBe(false)
    expect(taskListQuerySchema.safeParse({ overdue: value }).success).toBe(false)
  })

  test.each(['projectId', 'assignedTo'] as const)(
    '%s clears on empty and rejects a non-uuid',
    (key) => {
      expect(taskListQuerySchema.parse({ [key]: '' })[key]).toBeUndefined()
      expect(taskListQuerySchema.parse({ [key]: '  ' })[key]).toBeUndefined()
      expect(taskListQuerySchema.parse({ [key]: ` ${UUID} ` })[key]).toBe(UUID)
      expect(taskListQuerySchema.safeParse({ [key]: 'not-a-uuid' }).success).toBe(false)
    },
  )

  test('unknown status and priority values are rejected', () => {
    expect(taskListQuerySchema.safeParse({ status: 'done' }).success).toBe(false)
    expect(taskListQuerySchema.safeParse({ priority: 'urgent' }).success).toBe(false)
  })
})

describe('createTaskSchema', () => {
  const valid = { title: 'Write the report', projectId: UUID }

  test('defaults priority to medium', () => {
    expect(createTaskSchema.parse(valid).priority).toBe('medium')
  })

  test('a cleared description becomes null; an omitted one stays undefined', () => {
    expect(createTaskSchema.parse({ ...valid, description: '' }).description).toBeNull()
    expect(createTaskSchema.parse(valid).description).toBeUndefined()
  })

  test('an unassigned task is allowed', () => {
    expect(createTaskSchema.parse({ ...valid, assignedTo: null }).assignedTo).toBeNull()
  })

  test('a blank title, a bad project id and an impossible date are refused on their field', () => {
    const blank = createTaskSchema.safeParse({ ...valid, title: '   ' })
    expect(blank.success).toBe(false)
    expect(blank.error?.issues.map((issue) => issue.path)).toEqual([['title']])

    const project = createTaskSchema.safeParse({ ...valid, projectId: 'x' })
    expect(project.error?.issues.map((issue) => issue.path)).toEqual([['projectId']])

    const date = createTaskSchema.safeParse({ ...valid, dueDate: '2026-13-01' })
    expect(date.error?.issues.map((issue) => issue.path)).toEqual([['dueDate']])
  })
})

describe('the task PATCH bodies', () => {
  test('an empty update is refused with the shared message', () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Provide at least one field to update')
    expect(updateTaskSchema.safeParse({ title: 'x' }).success).toBe(true)
  })

  test('status and priority endpoints accept only their enums', () => {
    expect(updateTaskStatusSchema.safeParse({ status: 'blocked' }).success).toBe(true)
    expect(updateTaskStatusSchema.safeParse({ status: 'done' }).success).toBe(false)
    expect(updateTaskPrioritySchema.safeParse({ priority: 'critical' }).success).toBe(true)
    expect(updateTaskPrioritySchema.safeParse({ priority: 'urgent' }).success).toBe(false)
  })
})
