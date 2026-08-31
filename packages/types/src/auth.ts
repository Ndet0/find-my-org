import { z } from 'zod'

/**
 * Credentials for `POST /api/auth/sign-in/email`.
 *
 * Sign-in deliberately only checks that a password was typed. Enforcing a
 * minimum length here would leak the policy and would reject users whose
 * password predates it; length is the server's business at sign-up.
 */
export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

export type SignInInput = z.infer<typeof signInSchema>
