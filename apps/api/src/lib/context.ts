import type { Session } from '@opsflow/auth'

export type AuthUser = Session['user']
export type AuthSession = Session['session']

/**
 * Variables that authenticated routes read off the Hono context. Set by
 * `requireAuth` (see middleware/auth.ts).
 */
export type AppEnv = {
  Variables: {
    user: AuthUser
    session: AuthSession
  }
}
