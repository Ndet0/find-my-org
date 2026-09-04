import type { RoleName } from '@opsflow/types/permissions'
import type { Context } from 'hono'
import type { AppEnv } from './context.js'

/**
 * The caller of a mutation, reduced to what an activity row needs: who
 * to attribute it to, and a name for the human-readable description.
 */
export type EventActor = {
  id: string
  name: string
  role: RoleName
}

export function eventActor(c: Context<AppEnv>): EventActor {
  const user = c.get('user')
  return { id: user.id, name: user.name, role: c.get('role') }
}
