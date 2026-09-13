import { describe, expect, test } from 'bun:test'
import { visibleNavItems } from './nav-items'

/**
 * The navigation each role sees, restated as literals: a permission added to
 * or removed from the matrix has to be reflected here on purpose. Tested
 * without rendering the shell, which imports the theme control.
 */
const ALL = [
  'Dashboard',
  'Projects',
  'Tasks',
  'Clients',
  'Team',
  'Departments',
  'Activity',
  'Notifications',
]

describe('visibleNavItems', () => {
  test('admin and manager see every module, in the sidebar order', () => {
    expect(visibleNavItems('admin').map((item) => item.label)).toEqual(ALL)
    expect(visibleNavItems('manager').map((item) => item.label)).toEqual(ALL)
  })

  test('an employee sees their work and the feeds, not the organisation', () => {
    expect(visibleNavItems('employee').map((item) => item.label)).toEqual([
      'Dashboard',
      'Projects',
      'Tasks',
      'Activity',
      'Notifications',
    ])
  })

  test('the dashboard needs no permission', () => {
    const first = visibleNavItems('employee')[0]
    expect(first?.to).toBe('/')
    expect(first?.permission).toBeUndefined()
  })
})
