import { z } from 'zod'

/**
 * Fail fast on misconfiguration. An API that boots with a missing
 * DATABASE_URL only fails later, on the first request, in a much
 * less obvious way.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  // Railway, Render and most other platforms assign the port to bind and
  // inject it as PORT. It wins over API_PORT, which is the local convention:
  // binding anything else in a deployment means the health check never
  // answers and the release is rolled back.
  PORT: z.coerce.number().int().positive().optional(),
  // No default: this is both the CORS allow-list and Better Auth's trusted
  // origin, so guessing it wrong fails in confusing, security-shaped ways.
  WEB_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'

/** The port the server binds to, whoever named it. */
export const port = env.PORT ?? env.API_PORT
