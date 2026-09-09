import { type CurrentUser, updateProfileSchema } from '@opsflow/types/user'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldMessage } from '@/components/field-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type FieldErrorMap, fieldErrorsFrom, formErrorMessage } from '@/lib/api'
import { currentUserQueryOptions, updateProfile } from '@/lib/current-user'
import { userKeys } from '@/lib/users'

type ProfileFormValues = { name: string; phone: string }

/**
 * The two fields a person may change about themselves. Position is not one of
 * them — it says what someone does for the organisation, which is the work
 * assigner's to set, and `updateProfileSchema` leaves it out.
 */
export function ProfileForm({ user }: { user: CurrentUser }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    // Parsing here rather than in a form validator is what lets a local
    // ZodError and a 422 envelope land in the same `onError`, mapped onto
    // the same fields.
    mutationFn: (values: ProfileFormValues) =>
      updateProfile(
        updateProfileSchema.parse({
          name: values.name,
          // A cleared input means "remove it", which the schema turns into
          // null; sending the empty string would store one.
          phone: values.phone,
        }),
      ),
    onSuccess: async (saved) => {
      // The response is the whole profile, so it is written rather than
      // invalidated — there is nothing left to go and ask for.
      queryClient.setQueryData(currentUserQueryOptions.queryKey, saved)
      // Your name and phone are a row in the People directory too.
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
      // The shell reads the user from the `_authed` route context, which is a
      // snapshot taken in `beforeLoad` rather than a live subscription, so
      // without this the sidebar keeps showing the old name.
      await router.invalidate()
      toast.success('Your profile was updated')
      await router.navigate({ to: '/profile' })
    },
    onError: (error) => {
      setServerErrors(fieldErrorsFrom(error))
      setFormError(formErrorMessage(error, 'Your profile could not be saved'))
    },
  })

  const form = useForm({
    defaultValues: { name: user.name, phone: user.phone ?? '' } satisfies ProfileFormValues,
    onSubmit: async ({ value }) => {
      setServerErrors({})
      setFormError(null)
      await mutation.mutateAsync(value)
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

      <form.Field name="name">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Name</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(serverErrors.name)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.name?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Phone</Label>
            <Input
              id={field.name}
              type="tel"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Optional"
              autoComplete="tel"
              aria-invalid={Boolean(serverErrors.phone)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.phone?.[0]} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
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
