import {
  createProjectSchema,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type ProjectDetail,
  updateProjectSchema,
} from '@opsflow/types/project'
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
import { Textarea } from '@/components/ui/textarea'
import { ApiRequestError, type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { clientKeys, clientsQueryOptions } from '@/lib/clients'
import { createProject, projectKeys, updateProject } from '@/lib/projects'
import { usersQueryOptions } from '@/lib/users'

/** Radix Select cannot hold an empty value. */
const NONE = 'none'

type ProjectFormValues = {
  name: string
  description: string
  clientId: string
  managerId: string
  priority: PriorityLevel
  progress: string
  startDate: string
  deadline: string
}

function emptyValues(): ProjectFormValues {
  return {
    name: '',
    description: '',
    clientId: NONE,
    managerId: NONE,
    priority: 'medium',
    progress: '0',
    startDate: '',
    deadline: '',
  }
}

function valuesFrom(project: ProjectDetail): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    clientId: project.client?.id ?? NONE,
    managerId: project.manager?.id ?? NONE,
    priority: project.priority,
    progress: String(project.progress),
    startDate: project.startDate ?? '',
    deadline: project.deadline ?? '',
  }
}

function toPayload(values: ProjectFormValues, includeProgress: boolean) {
  return {
    name: values.name,
    description: values.description,
    clientId: values.clientId === NONE ? null : values.clientId,
    managerId: values.managerId === NONE ? null : values.managerId,
    startDate: values.startDate === '' ? null : values.startDate,
    deadline: values.deadline === '' ? null : values.deadline,
    ...(includeProgress ? { progress: values.progress } : { priority: values.priority }),
  }
}

export function ProjectForm({ project }: { project?: ProjectDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const clients = useQuery(clientsQueryOptions({ status: 'active', pageSize: 100 }))
  const people = useQuery(usersQueryOptions({ status: 'active', pageSize: 100 }))
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const isEdit = project !== undefined
  const managers = (people.data?.items ?? []).filter(
    (person) => person.role.name === 'admin' || person.role.name === 'manager',
  )

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      const payload = toPayload(values, isEdit)

      if (isEdit) {
        return updateProject(project.id, updateProjectSchema.parse(payload))
      }

      return createProject(createProjectSchema.parse(payload))
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      toast.success(isEdit ? `${saved.name} was updated` : `${saved.name} was added`)
      await router.navigate({ to: '/projects/$projectId', params: { projectId: saved.id } })
    },
    onError: (error) => {
      setServerErrors(fieldErrorsFrom(error))
      setFormError(error instanceof ApiRequestError ? error.message : 'The form could not be saved')
    },
  })

  const form = useForm({
    defaultValues: project ? valuesFrom(project) : emptyValues(),
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
              aria-invalid={Boolean(serverErrors.name)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.name?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Description</Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.description)}
              rows={4}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.description?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="clientId">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Client</Label>
            <Select value={field.state.value} onValueChange={field.handleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {(clients.data?.items ?? []).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company ? `${client.name} · ${client.company}` : client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.clientId?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="managerId">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Manager</Label>
            <Select value={field.state.value} onValueChange={field.handleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {managers.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.managerId?.[0]} />
          </div>
        )}
      </form.Field>

      {isEdit ? null : (
        <form.Field name="priority">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as PriorityLevel)}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((priority) => (
                    <SelectItem key={priority} value={priority} className="capitalize">
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldMessage errors={field.state.meta.errors} server={serverErrors.priority?.[0]} />
            </div>
          )}
        </form.Field>
      )}

      {isEdit ? (
        <form.Field name="progress">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Progress</Label>
              <Input
                id={field.name}
                type="number"
                min={0}
                max={100}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={Boolean(serverErrors.progress)}
              />
              <FieldMessage errors={field.state.meta.errors} server={serverErrors.progress?.[0]} />
            </div>
          )}
        </form.Field>
      ) : null}

      <form.Field name="startDate">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Start date</Label>
            <Input
              id={field.name}
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.startDate)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.startDate?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="deadline">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Deadline</Label>
            <Input
              id={field.name}
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.deadline)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.deadline?.[0]} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add project'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
