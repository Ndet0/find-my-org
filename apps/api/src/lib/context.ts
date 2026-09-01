import type { Session } from '@opsflow/auth'
import type { RoleName } from '@opsflow/types/permissions'

export type AuthUser = Session['user']
export type AuthSession = Session['session']

/**
 * Variables that authenticated routes read off the Hono context. Set by
 * `requireAuth` (see middleware/auth.ts).
 *
 * `role` is resolved there too, so authorization checks further down the
 * chain are a lookup rather than another query.
 */
export type AppEnv = {
  Variables: {
    user: AuthUser
    session: AuthSession
    role: RoleName
  }
}
