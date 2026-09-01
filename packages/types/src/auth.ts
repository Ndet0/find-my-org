import { z } from 'zod'

/**
 * The password policy, shared so `packages/auth` configures Better Auth with
 * the same bound the create form validates against. If they disagree, a
 * password the form accepts is rejected deeper in the stack, where the error
 * cannot be attached to the field.
 *
 * Six is short for an account that can read the whole directory. It is a
 * deliberate concession to demo convenience and is recorded as a
 * pre-production item in docs/sprint.md §24.
 */
export const PASSWORD_MIN_LENGTH = 6

/** Better Auth's own default ceiling; restated so the form can report it. */
export const PASSWORD_MAX_LENGTH = 128

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
