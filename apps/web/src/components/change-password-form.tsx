import { type ChangePasswordInput, changePasswordSchema } from '@opsflow/types/auth'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldMessage } from '@/components/field-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type FieldErrorMap, fieldErrorsFrom, formErrorMessage } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { currentUserQueryOptions } from '@/lib/current-user'
import { markBackupStale, rewrapMessaging } from '@/lib/dm-identity'

/**
 * Better Auth's code for a current password that does not match. It is the one
 * failure that belongs on a field rather than in the banner.
 */
const INVALID_PASSWORD = 'INVALID_PASSWORD'

/**
 * A refused password change.
 *
 * Better Auth does not answer with the OPSflow error envelope, so its failures
 * cannot honestly be an `ApiRequestError` — `lib/api.ts` defines that as a
 * failure the API reported through the envelope, and `route-feedback.tsx`
 * reads it as exactly that. This carries the two things the form needs
 * instead: the line for the banner, and the field to hang it on when the
 * current password was wrong.
 */
class ChangePasswordError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: FieldErrorMap = {},
  ) {
    super(message)
    this.name = 'ChangePasswordError'
  }
}

/**
 * Changing your own password, the one account operation a person may perform
 * on themselves.
 *
 * This does not go through `PATCH /api/me`: Better Auth owns the hash and is
 * the only thing that can verify the current password before replacing it. Its
 * endpoints answer with their own shape rather than the OPSflow envelope, so
 * the call goes through `authClient` rather than `apiFetch`, and its failures
 * arrive as a returned `{ error }` rather than a thrown one.
 */
export function ChangePasswordForm() {
  const router = useRouter()
  const user = useQuery(currentUserQueryOptions).data
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (values: ChangePasswordInput) => {
      // Throws a ZodError for a short, unchanged or mistyped password, which
      // `fieldErrorsFrom` maps onto the same fields as a server failure.
      const parsed = changePasswordSchema.parse(values)

      const { error } = await authClient.changePassword({
        currentPassword: parsed.currentPassword,
        newPassword: parsed.newPassword,
        // A password is changed because the old one is no longer trusted, so
        // the sessions it opened elsewhere go with it. Better Auth issues this
        // browser a fresh session cookie in the same response, so only the
        // other devices are signed out.
        revokeOtherSessions: true,
      })

      if (error) {
        throw error.code === INVALID_PASSWORD
          ? new ChangePasswordError('Check your current password and try again', {
              currentPassword: ['That is not your current password'],
            })
          : new ChangePasswordError(error.message ?? 'The password could not be changed')
      }

      // The messaging key's backup is sealed under the password, so it is
      // re-sealed under the new one; otherwise the next device could not
      // unlock it. The password has already changed, so a failure here is a
      // warning rather than a refusal — but one that is remembered: the
      // Messages page sees the mark and asks for the password to retry.
      if (user) {
        await rewrapMessaging(user.id, parsed.currentPassword, parsed.newPassword).catch(() => {
          markBackupStale(user.id)
          toast.warning(
            'Your password was changed, but your secure-messaging backup could not be updated. Open Messages on this device to retry; until then, other devices cannot unlock your messages.',
          )
        })
      }
    },
    onSuccess: async () => {
      toast.success('Your password was changed. Any other device has been signed out.')
      await router.navigate({ to: '/profile' })
    },
    // A local ZodError still falls through to the shared helpers, so a short
    // or mismatched password reports itself exactly as in every other form.
    onError: (error) => {
      setServerErrors(
        error instanceof ChangePasswordError ? error.fieldErrors : fieldErrorsFrom(error),
      )
      setFormError(
        error instanceof ChangePasswordError
          ? error.message
          : formErrorMessage(error, 'The password could not be changed'),
      )
    },
  })

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    } satisfies ChangePasswordInput,
    onSubmit: async ({ value }) => {
      setServerErrors({})
      setFormError(null)
      // `onError` owns the failure; without the catch it is also an unhandled rejection.
      await mutation.mutateAsync(value).catch(() => undefined)
    },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <form.Field name="currentPassword">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Current password</Label>
            <Input
              id={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(serverErrors.currentPassword)}
            />
            <FieldMessage
              errors={field.state.meta.errors}
              server={serverErrors.currentPassword?.[0]}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="newPassword">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>New password</Label>
            <Input
              id={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(serverErrors.newPassword)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.newPassword?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Confirm new password</Label>
            <Input
              id={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(serverErrors.confirmPassword)}
            />
            <FieldMessage
              errors={field.state.meta.errors}
              server={serverErrors.confirmPassword?.[0]}
            />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Change password'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => router.history.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
