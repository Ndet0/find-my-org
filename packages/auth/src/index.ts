import { expo } from '@better-auth/expo'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { prisma } from '@opsflow/db'
import { PASSWORD_MIN_LENGTH } from '@opsflow/types/auth'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { verifyPassword as verifyPasswordHash } from 'better-auth/crypto'

/**
 * Least-privileged role. `users.role_id` is NOT NULL, so every creation
 * path has to resolve a role, and the safe default is the one that grants
 * nothing beyond a user's own assigned work.
 */
const DEFAULT_ROLE_NAME = 'employee'

/** The value shipped in `.env.example`; booting with it would be insecure. */
const PLACEHOLDER_SECRET = 'replace-me-with-a-32-byte-random-string'

/**
 * The mobile app identifies itself by its URL scheme (`expo.scheme` in
 * apps/mobile/app.json) rather than by an HTTP origin. Better Auth checks
 * it the same way it checks the web origin, so a request from an app that
 * is not ours is refused before it reaches the credential check.
 */
const MOBILE_SCHEME = 'opsflow://'

/**
 * Development-only origins. Expo Go presents itself as `exp://<lan-ip>`,
 * and the mobile app's web build, used to exercise it in a browser, runs
 * on Expo's dev server. None of these exist in a production deployment.
 */
const DEVELOPMENT_ORIGINS = [
  'exp://',
  'exp://**',
  'exp://192.168.*.*:*/**',
  'http://localhost:8081',
]

const isProduction = process.env.NODE_ENV === 'production'

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not set — copy .env.example to .env`)
  }

  return value
}

function requireSecret(): string {
  const secret = requireEnv('BETTER_AUTH_SECRET')

  if (secret === PLACEHOLDER_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is still the .env.example placeholder — generate one with: openssl rand -base64 32',
    )
  }

  return secret
}

async function defaultRoleId(): Promise<string> {
  const role = await prisma.role.findUnique({
    where: { name: DEFAULT_ROLE_NAME },
    select: { id: true },
  })

  if (!role) {
    throw new APIError('INTERNAL_SERVER_ERROR', {
      code: 'ROLES_NOT_SEEDED',
      message: `The "${DEFAULT_ROLE_NAME}" role does not exist — run the database seed before creating users`,
    })
  }

  return role.id
}

export const auth = betterAuth({
  appName: 'OPSflow',
  secret: requireSecret(),
  baseURL: requireEnv('BETTER_AUTH_URL'),
  basePath: '/api/auth',
  trustedOrigins: [
    requireEnv('WEB_URL'),
    MOBILE_SCHEME,
    ...(isProduction ? [] : DEVELOPMENT_ORIGINS),
  ],

  // Adds the endpoints and cookie handling the Expo client relies on.
  plugins: [expo()],

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
    // Signup writes users + accounts; a partial failure must not leave a
    // credential-less user behind.
    transaction: true,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,

    // Signup is how an admin provisions someone else's account, so the
    // caller must not be signed in as the account they just created. Without
    // this, every admin-create would also write a session row for the new
    // user that nobody ever uses.
    //
    // Note the side effect: with auto sign-in off, Better Auth answers a
    // duplicate email with a generic synthetic user instead of an error, to
    // avoid confirming who has an account. Callers cannot rely on this
    // endpoint to detect a collision — services/user.service.ts checks the
    // address first.
    autoSignIn: false,
  },

  user: {
    // `input: false` keeps these out of the signup payload. A caller must
    // never be able to choose its own role, department or status.
    //
    // `roleId` is declared optional even though `users.role_id` is NOT NULL:
    // Better Auth validates the request payload before the create hook runs,
    // so marking it required rejects every signup with "roleId is required"
    // before the hook gets a chance to supply it. The NOT NULL column stays
    // the real guarantee.
    additionalFields: {
      roleId: { type: 'string', required: false, input: false },
      departmentId: { type: 'string', required: false, input: false },
      status: {
        type: ['active', 'inactive', 'suspended'],
        required: false,
        defaultValue: 'active',
        input: false,
      },
    },
  },

  // Better Auth's limiter is on in production only, keyed by IP, and covers
  // its own endpoints — sign-in is the one that matters. Its default store is
  // process memory, which is per instance; the database store shares the
  // count across instances through the same Prisma adapter, at the cost of
  // one small table (`rate_limits` in the schema).
  rateLimit: {
    enabled: isProduction,
    storage: 'database',
  },

  advanced: {
    // The web app and the API are deployed on one registrable domain
    // (app.<domain> and api.<domain>), so `SameSite=Lax` — Better Auth's
    // default — is the right setting and is written out here so the
    // decision is visible. A cross-site deployment would need `none`, which
    // Safari's tracking protection then blocks by default. `Secure` is on in
    // production; local development is plain http.
    useSecureCookies: isProduction,
    defaultCookieAttributes: { sameSite: 'lax' },
    // Better Auth turns its origin check off by default whenever NODE_ENV is
    // `test`, which Bun's test runner sets. Pinning it on means the API tests
    // exercise the same trusted-origin rule as production, and a stray
    // NODE_ENV can never switch it off silently.
    disableOriginCheck: false,
    database: {
      // Let Prisma's `@default(uuid(7))` supply ids. Better Auth's own
      // generator does not emit UUIDs, which the `uuid` columns reject.
      generateId: false,
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Sign-in checks the password and nothing else, so a suspended or
        // deactivated person could otherwise mint a fresh session and reach
        // Better Auth's own endpoints, which sit in front of the API's
        // `requireAuth`. Refusing the session here closes that door with
        // the same message the API gives an existing session.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { status: true },
          })

          if (user && user.status !== 'active') {
            throw new APIError('FORBIDDEN', { message: 'This account is not active' })
          }
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          // Additional fields are not inferred in hooks yet, so a role
          // supplied by internal callers has to be read through a cast.
          const incoming = user as typeof user & { roleId?: string | null }

          return {
            data: {
              ...user,
              roleId: incoming.roleId ?? (await defaultRoleId()),
            },
          }
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session

/**
 * Better Auth's error class, re-exported so the API can recognise a failure
 * from `auth.api.*` by `instanceof` without depending on `better-auth`
 * itself. Anything else that escapes one of those calls is not Better Auth
 * refusing the request; it is a fault, and is reported as one.
 */
export { APIError }

/**
 * Whether `password` is the account password of `userId`, checked against
 * the credential hash Better Auth keeps, with the same verifier sign-in
 * uses. For an operation a session cookie alone should not authorise —
 * replacing the messaging key backup — where the person is asked to prove
 * they are still at the keyboard. An account with no credential (none
 * exist today; every account is provisioned with a password) verifies
 * nothing.
 */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { password: true },
  })

  if (!account?.password) {
    return false
  }

  return verifyPasswordHash({ hash: account.password, password })
}
