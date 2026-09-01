import { prisma } from '@opsflow/db'
import { isRoleName, type RoleName } from '@opsflow/types/permissions'

/**
 * Maps `users.role_id` to the role name the permission matrix is keyed by.
 *
 * The session carries only the id, and every authorized request needs the
 * name. Rather than join `roles` on each one, the three seeded rows are read
 * once and memoised: they are reference data that changes only when the seed
 * changes, and the process restarts when that happens.
 *
 * The promise itself is cached, not its result, so concurrent requests during
 * startup share a single query instead of racing.
 *
 * If Phase 19 introduces runtime-editable custom roles, this needs an
 * invalidation path — a role created after boot would not be found here.
 */
type RoleMaps = {
  byId: ReadonlyMap<string, RoleName>
  byName: ReadonlyMap<RoleName, string>
}

let roles: Promise<RoleMaps> | null = null

async function loadRoles(): Promise<RoleMaps> {
  const rows = await prisma.role.findMany({ select: { id: true, name: true } })

  const byId = new Map<string, RoleName>()
  const byName = new Map<RoleName, string>()

  for (const row of rows) {
    // A role the matrix has no entry for grants nothing. Recording it would
    // let `can()` be called with a name it cannot answer for.
    if (isRoleName(row.name)) {
      byId.set(row.id, row.name)
      byName.set(row.name, row.id)
    }
  }

  return { byId, byName }
}

function load(): Promise<RoleMaps> {
  roles ??= loadRoles().catch((err) => {
    // Do not cache a failed lookup; the next request should retry rather than
    // treat a transient database error as "no roles exist".
    roles = null
    throw err
  })

  return roles
}

export function roleNameById(id: string): Promise<RoleName | undefined> {
  return load().then(({ byId }) => byId.get(id))
}

/**
 * The reverse direction, for writes: callers choose a role by name, because
 * that is what the permission matrix is keyed by and it keeps opaque ids out
 * of request bodies.
 */
export function roleIdByName(name: RoleName): Promise<string | undefined> {
  return load().then(({ byName }) => byName.get(name))
}
