import { app } from '../src/app'

/**
 * What both API test files share: the seeded accounts, the sign-in request,
 * and a guard that fails the run early — with a fix — when a seeded password
 * is no longer what the tests expect.
 *
 * Not a test file (no `.test.` in the name), so Bun does not run it.
 */

export const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'opsflow-dev-password'
export const WEB_ORIGIN = process.env.WEB_URL ?? 'http://localhost:5173'

export const ACCOUNTS = {
  admin: 'admin@opsflow.local',
  manager: 'manager@opsflow.local',
  employee: 'employee@opsflow.local',
} as const

export type Role = keyof typeof ACCOUNTS

/** `POST /api/auth/sign-in/email`, as either client sends it. */
export async function signInRequest(
  email: string,
  password: string,
  origin = WEB_ORIGIN,
): Promise<Response> {
  return app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ email, password }),
  })
}

/**
 * Better Auth may set more than one cookie; a client sends back the
 * name=value pairs and nothing else, which is what the mobile app does.
 */
export function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ')
}

/**
 * The tests sign in as the three seeded users with `SEED_USER_PASSWORD`.
 * `pnpm db:seed` skips a user that already exists, so a password changed by
 * hand stays changed, and without this every later sign-in fails with a bare
 * 401 and nothing says why. Registered with `beforeAll` in each test file.
 */
export async function assertSeededAccounts(): Promise<void> {
  const refused: string[] = []

  for (const [role, email] of Object.entries(ACCOUNTS)) {
    const response = await signInRequest(email, PASSWORD)
    if (response.status !== 200) {
      refused.push(`- ${email} (${role}) refused SEED_USER_PASSWORD with HTTP ${response.status}`)
    }
  }

  if (refused.length === 0) {
    return
  }

  const lines = [
    'A seeded account cannot sign in, so the API tests cannot run:',
    ...refused,
    '',
    '`pnpm db:seed` skips a user that already exists, so a password changed by hand',
    'stays changed. Set it back through /profile/password in the web app, or rebuild',
    'the database with `pnpm db:reset && pnpm db:seed`.',
  ]

  if (refused.some((line) => line.includes(ACCOUNTS.employee))) {
    lines.push(
      '',
      'The employee is the account rules.test.ts rotates; an aborted run of that test',
      'is the likely cause.',
    )
  }

  throw new Error(lines.join('\n'))
}
