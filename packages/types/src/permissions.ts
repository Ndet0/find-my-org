/**
 * The OPSflow permission matrix, from docs/technical_architecture.md §11.
 *
 * A permission answers one question: **may this role attempt this operation
 * at all?** It deliberately says nothing about *which rows* a caller may
 * touch. Rules like "an employee sees only their assigned tasks" cannot be
 * expressed as a flat string, so they live in the service layer as a `where`
 * clause derived from the caller.
 *
 * Keeping the two apart matters: a role gate can be checked by middleware
 * before a handler runs, whereas row scoping needs the query.
 *
 * This module is imported by the API to enforce permissions and by the
 * clients to hide controls the caller cannot use. Hiding a control is a
 * courtesy, not a security boundary — the API checks again regardless.
 */

export const ROLE_NAMES = ['admin', 'manager', 'employee'] as const

export type RoleName = (typeof ROLE_NAMES)[number]

export const PERMISSIONS = [
  'users:read',
  'users:write',
  'departments:read',
  'departments:write',
  'clients:read',
  'clients:write',
  'projects:read',
  'projects:write',
  'tasks:read',
  'tasks:write',
  'activity:read',
  'notifications:read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

/**
 * Admin administers the organisation. Manager runs delivery: full control of
 * clients, projects and tasks, read-only visibility of the people directory.
 * Employee reads the work they are involved in and nothing else — the row
 * scoping that narrows "projects" to "my projects" is applied by the services.
 */
export const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  admin: PERMISSIONS,
  manager: [
    'users:read',
    'departments:read',
    'clients:read',
    'clients:write',
    'projects:read',
    'projects:write',
    'tasks:read',
    'tasks:write',
    'activity:read',
    'notifications:read',
  ],
  employee: ['projects:read', 'tasks:read', 'activity:read', 'notifications:read'],
}

export function can(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** Narrows an arbitrary role name, such as one read from the database. */
export function isRoleName(value: string): value is RoleName {
  return (ROLE_NAMES as readonly string[]).includes(value)
}
