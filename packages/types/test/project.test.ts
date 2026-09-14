import { describe, expect, test } from 'bun:test'
import {
  canTransitionProject,
  createProjectSchema,
  nextProjectStatuses,
  PROJECT_STATUSES,
  type ProjectStatus,
  projectListQuerySchema,
  projectStatusText,
  updateProjectSchema,
} from '../src/project'

const UUID = '01a057c2-6a1f-7512-84e4-a4205576ff78'
const DATES_MESSAGE = 'The deadline must be on or after the start date'

/**
 * The project lifecycle from docs/product_architecture.md §14 with the
 * amendments recorded in sprint.md — `cancelled` reachable from every open
 * status and terminal, `completed` reopening to `active` — restated as a
 * literal so the table cannot drift unnoticed.
 */
const ALLOWED: Record<ProjectStatus, readonly ProjectStatus[]> = {
  planning: ['active', 'cancelled'],
  active: ['on_hold', 'delayed', 'completed', 'cancelled'],
  on_hold: ['active', 'cancelled'],
  delayed: ['active', 'cancelled'],
  completed: ['active'],
  cancelled: [],
}

describe('project transitions', () => {
  const pairs = PROJECT_STATUSES.flatMap((from) =>
    PROJECT_STATUSES.map((to) => [from, to] as const),
  )

  test.each(pairs)('%s → %s', (from, to) => {
    expect(canTransitionProject(from, to)).toBe(ALLOWED[from].includes(to))
  })

  test.each([...PROJECT_STATUSES])(
    'nextProjectStatuses(%s) offers the documented moves only',
    (from) => {
      expect(nextProjectStatuses(from)).toEqual(ALLOWED[from])
      expect(nextProjectStatuses(from)).not.toContain(from)
    },
  )

  test('cancelled is the one terminal status', () => {
    expect(nextProjectStatuses('cancelled')).toEqual([])
    for (const to of PROJECT_STATUSES) {
      expect(canTransitionProject('cancelled', to)).toBe(false)
    }
  })

  test('a completed project reopens to active and nowhere else', () => {
    expect(nextProjectStatuses('completed')).toEqual(['active'])
  })

  test('on hold and delayed resume through active rather than completing directly', () => {
    expect(canTransitionProject('on_hold', 'completed')).toBe(false)
    expect(canTransitionProject('delayed', 'completed')).toBe(false)
    expect(canTransitionProject('on_hold', 'active')).toBe(true)
    expect(canTransitionProject('delayed', 'active')).toBe(true)
  })

  test('projectStatusText reads the underscore as a space', () => {
    expect(projectStatusText('on_hold')).toBe('on hold')
  })
})

describe('the deadline rule', () => {
  const create = { name: 'Rollout' }

  test('a deadline before the start date is refused on the deadline field', () => {
    const result = createProjectSchema.safeParse({
      ...create,
      startDate: '2026-02-01',
      deadline: '2026-01-31',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toHaveLength(1)
    expect(result.error?.issues[0]?.path).toEqual(['deadline'])
    expect(result.error?.issues[0]?.message).toBe(DATES_MESSAGE)
  })

  test('the same day, either date alone, and neither date all pass', () => {
    const same = { ...create, startDate: '2026-02-01', deadline: '2026-02-01' }
    expect(createProjectSchema.safeParse(same).success).toBe(true)
    expect(createProjectSchema.safeParse({ ...create, deadline: '2026-01-01' }).success).toBe(true)
    expect(createProjectSchema.safeParse({ ...create, startDate: '2026-01-01' }).success).toBe(true)
    expect(
      createProjectSchema.safeParse({ ...create, startDate: null, deadline: null }).success,
    ).toBe(true)
  })

  test('applies to an update carrying both dates, and only then', () => {
    const both = updateProjectSchema.safeParse({ startDate: '2026-02-01', deadline: '2026-01-31' })
    expect(both.error?.issues.map((issue) => issue.path)).toEqual([['deadline']])
    // With one date the stored row holds the other; the API compares against
    // it separately, so the schema stays out of the way.
    expect(updateProjectSchema.safeParse({ deadline: '2026-01-01' }).success).toBe(true)
  })
})

describe('createProjectSchema', () => {
  test('defaults priority to medium', () => {
    expect(createProjectSchema.parse({ name: 'Rollout' }).priority).toBe('medium')
  })

  test('an empty client id is refused: the form must send null, not ""', () => {
    // `clientId` is a nullable uuid, not an optional text field. The select
    // maps its empty option to null; this pins that the schema will not do it.
    expect(createProjectSchema.safeParse({ name: 'Rollout', clientId: '' }).success).toBe(false)
    expect(createProjectSchema.safeParse({ name: 'Rollout', clientId: null }).success).toBe(true)
    expect(createProjectSchema.safeParse({ name: 'Rollout', clientId: UUID }).success).toBe(true)
  })
})

describe('updateProjectSchema', () => {
  test('an empty update is refused with the shared message', () => {
    const result = updateProjectSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Provide at least one field to update')
  })

  test('progress is a whole number from 0 to 100, never coerced', () => {
    expect(updateProjectSchema.parse({ progress: 0 }).progress).toBe(0)
    expect(updateProjectSchema.parse({ progress: 100 }).progress).toBe(100)
    for (const bad of [101, -1, 50.5, Number.NaN]) {
      expect(updateProjectSchema.safeParse({ progress: bad }).success).toBe(false)
    }
    // A cleared input used to arrive as '' or null and silently become 0%.
    for (const cleared of ['', null, '50']) {
      expect(updateProjectSchema.safeParse({ progress: cleared }).success).toBe(false)
    }
  })
})

describe('projectListQuerySchema', () => {
  test('overdue is false unless the string "true" is sent', () => {
    expect(projectListQuerySchema.parse({}).overdue).toBe(false)
    expect(projectListQuerySchema.parse({ overdue: 'true' }).overdue).toBe(true)
    expect(projectListQuerySchema.safeParse({ overdue: 'false' }).success).toBe(false)
  })

  test.each(['clientId', 'managerId'] as const)(
    '%s clears on empty and rejects a non-uuid',
    (key) => {
      expect(projectListQuerySchema.parse({ [key]: '' })[key]).toBeUndefined()
      expect(projectListQuerySchema.parse({ [key]: UUID })[key]).toBe(UUID)
      expect(projectListQuerySchema.safeParse({ [key]: 'nope' }).success).toBe(false)
    },
  )
})
