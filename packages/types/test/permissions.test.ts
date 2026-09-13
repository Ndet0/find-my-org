import { describe, expect, test } from 'bun:test'
import {
  can,
  isRoleName,
  PERMISSIONS,
  type Permission,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
  type RoleName,
} from '../src/permissions'

/**
 * The matrix from docs/technical_architecture.md §11, restated as a literal
 * so a change to `ROLE_PERMISSIONS` has to be made here too, deliberately.
 * Deriving it from the export would only prove the module agrees with itself.
 */
const EXPECTED: Record<RoleName, Record<Permission, boolean>> = {
  admin: {
    'users:read': true,
    'users:write': true,
    'departments:read': true,
    'departments:write': true,
    'clients:read': true,
    'clients:write': true,
    'projects:read': true,
    'projects:write': true,
    'tasks:read': true,
    'tasks:write': true,
    'activity:read': true,
    'notifications:read': true,
    'dashboard:read': true,
  },
  manager: {
    'users:read': true,
    'users:write': false,
    'departments:read': true,
    'departments:write': false,
    'clients:read': true,
    'clients:write': true,
    'projects:read': true,
    'projects:write': true,
    'tasks:read': true,
    'tasks:write': true,
    'activity:read': true,
    'notifications:read': true,
    'dashboard:read': true,
  },
  employee: {
    'users:read': false,
    'users:write': false,
    'departments:read': false,
    'departments:write': false,
    'clients:read': false,
    'clients:write': false,
    'projects:read': true,
    'projects:write': false,
    'tasks:read': true,
    'tasks:write': false,
    'activity:read': true,
    'notifications:read': true,
    'dashboard:read': true,
  },
}

describe('the permission vocabulary', () => {
  test('has thirteen distinct permissions', () => {
    expect(PERMISSIONS).toHaveLength(13)
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length)
  })

  test('has exactly three roles', () => {
    expect(ROLE_NAMES).toEqual(['admin', 'manager', 'employee'])
  })

  test.each([...ROLE_NAMES])('%s is granted only known permissions, once each', (role) => {
    const granted = ROLE_PERMISSIONS[role]
    for (const permission of granted) {
      expect(PERMISSIONS).toContain(permission)
    }
    expect(new Set(granted).size).toBe(granted.length)
  })
})

describe('can()', () => {
  const pairs = ROLE_NAMES.flatMap((role) =>
    PERMISSIONS.map((permission) => [role, permission] as const),
  )

  test.each(pairs)('%s / %s matches the documented matrix', (role, permission) => {
    expect(can(role, permission)).toBe(EXPECTED[role][permission])
  })

  test('an unknown role throws rather than answering false', () => {
    // Pins current behaviour, not a contract: `can` trusts its input, which is
    // why `isRoleName` narrows a role name read from the database first.
    expect(() => can('root' as RoleName, 'users:read')).toThrow(TypeError)
  })
})

describe('isRoleName()', () => {
  test.each(['admin', 'manager', 'employee'])('accepts %s', (value) => {
    expect(isRoleName(value)).toBe(true)
  })

  test.each(['', 'Admin', 'root', 'employee '])('rejects %j', (value) => {
    expect(isRoleName(value)).toBe(false)
  })
})
