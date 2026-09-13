import { ROLE_NAMES, type RoleName } from '@opsflow/types/permissions'
import { createUserSchema, type UserDetail, updateUserSchema } from '@opsflow/types/user'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldMessage } from '@/components/field-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type FieldErrorMap, fieldErrorsFrom, formErrorMessage } from '@/lib/api'
import { currentUserQueryOptions } from '@/lib/current-user'
import { departmentKeys, departmentsQueryOptions } from '@/lib/departments'
import { createUser, updateUser, userKeys } from '@/lib/users'

/** Radix Select cannot hold an empty value. */
const NONE = 'none'

type UserFormValues = {
  name: string
  email: string
  password: string
  role: RoleName
  departmentId: string
  position: string
  phone: string
  joinedAt: string
}

function emptyValues(): UserFormValues {
  return {
    name: '',
    email: '',
    password: '',
    role: 'employee',
    departmentId: NONE,
    position: '',
    phone: '',
    joinedAt: '',
  }
}

function valuesFrom(user: UserDetail): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role.name,
    departmentId: user.department?.id ?? NONE,
    position: user.position ?? '',
    phone: user.phone ?? '',
    joinedAt: user.joinedAt ?? '',
  }
}

function toPayload(values: UserFormValues) {
  return {
    name: values.name,
    email: values.email,
    role: values.role,
    departmentId: values.departmentId === NONE ? null : values.departmentId,
    position: values.position,
    phone: values.phone,
    joinedAt: values.joinedAt === '' ? null : values.joinedAt,
  }
}

export function UserForm({ user }: { user?: UserDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const departments = useQuery(departmentsQueryOptions)
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const isEdit = user !== undefined

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      const payload = toPayload(values)

      if (isEdit) {
        return updateUser(user.id, updateUserSchema.parse(payload))
      }

      return createUser(createUserSchema.parse({ ...payload, password: values.password }))
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })
      await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      toast.success(isEdit ? `${saved.name} was updated` : `${saved.name} was added`)
      await router.navigate({ to: '/users/$userId', params: { userId: saved.id } })
    },
    onError: (error) => {
      setServerErrors(fieldErrorsFrom(error))
      setFormError(formErrorMessage(error, 'The form could not be saved'))
    },
  })

  const form = useForm({
    defaultValues: user ? valuesFrom(user) : emptyValues(),
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

      {isEdit ? null : (
        <form.Field name="password">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Initial password</Label>
              <Input
                id={field.name}
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={Boolean(serverErrors.password)}
              />
              <FieldMessage errors={field.state.meta.errors} server={serverErrors.password?.[0]} />
            </div>
          )}
        </form.Field>
      )}

      <form.Field name="role">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as RoleName)}
            >
              <SelectTrigger className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_NAMES.map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.role?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="departmentId">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Department</Label>
            <Select value={field.state.value} onValueChange={field.handleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {(departments.data ?? []).map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldMessage
              errors={field.state.meta.errors}
              server={serverErrors.departmentId?.[0]}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="position">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Position</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.position?.[0]} />
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
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.phone?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="joinedAt">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Joined</Label>
            <Input
              id={field.name}
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.joinedAt?.[0]} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add person'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
