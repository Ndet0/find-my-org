import { type ClientDetail, createClientSchema, updateClientSchema } from '@opsflow/types/client'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldMessage } from '@/components/field-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type FieldErrorMap, fieldErrorsFrom, formErrorMessage } from '@/lib/api'
import { clientKeys, createClient, updateClient } from '@/lib/clients'

type ClientFormValues = {
  name: string
  company: string
  email: string
  phone: string
  address: string
  notes: string
}

function emptyValues(): ClientFormValues {
  return {
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  }
}

function valuesFrom(client: ClientDetail): ClientFormValues {
  return {
    name: client.name,
    company: client.company ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    notes: client.notes ?? '',
  }
}

function toPayload(values: ClientFormValues) {
  return {
    name: values.name,
    company: values.company,
    email: values.email,
    phone: values.phone,
    address: values.address,
    notes: values.notes,
  }
}

export function ClientForm({ client }: { client?: ClientDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const isEdit = client !== undefined

  const mutation = useMutation({
    mutationFn: (values: ClientFormValues) => {
      const payload = toPayload(values)

      if (isEdit) {
        return updateClient(client.id, updateClientSchema.parse(payload))
      }

      return createClient(createClientSchema.parse(payload))
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      toast.success(isEdit ? `${saved.name} was updated` : `${saved.name} was added`)
      await router.navigate({ to: '/clients/$clientId', params: { clientId: saved.id } })
    },
    onError: (error) => {
      setServerErrors(fieldErrorsFrom(error))
      setFormError(formErrorMessage(error, 'The form could not be saved'))
    },
  })

  const form = useForm({
    defaultValues: client ? valuesFrom(client) : emptyValues(),
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

      <form.Field name="name">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Name</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.name)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.name?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="company">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Company</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.company)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.company?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              type="email"
              autoComplete="off"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.email)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.email?.[0]} />
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
              aria-invalid={Boolean(serverErrors.phone)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.phone?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="address">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Address</Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.address)}
              rows={3}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.address?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Notes</Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.notes)}
              rows={4}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.notes?.[0]} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add client'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
