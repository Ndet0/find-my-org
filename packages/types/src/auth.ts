import { z } from 'zod'

/**
 * The password policy, shared so `packages/auth` configures Better Auth with
 * the same bound the create form validates against. If they disagree, a
 * password the form accepts is rejected deeper in the stack, where the error
 * cannot be attached to the field.
 *
 * Eight is the common floor. It was six until the Phase 17 security review,
 * a demo concession; the seeded development password is well past either.
 */
export const PASSWORD_MIN_LENGTH = 8

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

/**
 * The password policy as a schema, shared so every place a password is
 * chosen — an admin creating an account, a person changing their own —
 * reports the same bounds in the same words.
 */
export const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `A password must be ${PASSWORD_MAX_LENGTH} characters or fewer`)

/**
 * The body of `POST /api/auth/change-password`, Better Auth's own endpoint.
 *
 * Changing a password is an account operation rather than a profile edit, so
 * it does not go through `PATCH /api/me`: Better Auth owns the hash and is
 * the only thing that can verify the current password before replacing it.
 *
 * `confirmPassword` never leaves the client. It exists because the fields are
 * masked, and a typo in a new password locks someone out of the account they
 * were trying to secure.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    path: ['newPassword'],
    message: 'The new password must be different from the current one',
  })
  .refine((body) => body.newPassword === body.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match',
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
