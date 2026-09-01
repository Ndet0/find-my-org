import { prismaAdapter } from '@better-auth/prisma-adapter'
import { prisma } from '@opsflow/db'
import { PASSWORD_MIN_LENGTH } from '@opsflow/types/auth'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'

/**
 * Least-privileged role. `users.role_id` is NOT NULL, so every creation
 * path has to resolve a role, and the safe default is the one that grants
 * nothing beyond a user's own assigned work.
 */
const DEFAULT_ROLE_NAME = 'employee'

/** The value shipped in `.env.example`; booting with it would be insecure. */
const PLACEHOLDER_SECRET = 'replace-me-with-a-32-byte-random-string'

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
  trustedOrigins: [requireEnv('WEB_URL')],

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

  advanced: {
    database: {
      // Let Prisma's `@default(uuid(7))` supply ids. Better Auth's own
      // generator does not emit UUIDs, which the `uuid` columns reject.
      generateId: false,
    },
  },

  databaseHooks: {
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
