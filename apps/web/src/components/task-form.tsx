import { PRIORITY_LEVELS, type PriorityLevel } from '@opsflow/types/project'
import { createTaskSchema, type TaskDetail, updateTaskSchema } from '@opsflow/types/task'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { projectKeys, projectQueryOptions, projectsQueryOptions } from '@/lib/projects'
import { createTask, taskKeys, updateTask } from '@/lib/tasks'

/** Radix Select cannot hold an empty value. */
const NONE = 'none'

type TaskFormValues = {
  title: string
  description: string
  projectId: string
  assignedTo: string
  priority: PriorityLevel
  dueDate: string
}

function emptyValues(defaultProjectId?: string): TaskFormValues {
  return {
    title: '',
    description: '',
    projectId: defaultProjectId ?? NONE,
    assignedTo: NONE,
    priority: 'medium',
    dueDate: '',
  }
}

function valuesFrom(task: TaskDetail): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    projectId: task.project.id,
    assignedTo: task.assignee?.id ?? NONE,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
  }
}

function toPayload(values: TaskFormValues, includePriority: boolean) {
  return {
    title: values.title,
    description: values.description,
    projectId: values.projectId,
    assignedTo: values.assignedTo === NONE ? null : values.assignedTo,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    ...(includePriority ? { priority: values.priority } : {}),
  }
}

function assigneeOptions(project: {
  manager: { id: string; name: string } | null
  members: { user: { id: string; name: string } }[]
}) {
  const people = new Map<string, string>()

  if (project.manager) {
    people.set(project.manager.id, project.manager.name)
  }

  for (const member of project.members) {
    people.set(member.user.id, member.user.name)
  }

  return [...people.entries()].map(([id, name]) => ({ id, name }))
}

export function TaskForm({
  task,
  defaultProjectId,
}: {
  task?: TaskDetail
  defaultProjectId?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const projects = useQuery(projectsQueryOptions({ pageSize: 100 }))
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const isEdit = task !== undefined

  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const payload = toPayload(values, !isEdit)

      if (isEdit) {
        return updateTask(task.id, updateTaskSchema.parse(payload))
      }

      return createTask(createTaskSchema.parse(payload))
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(isEdit ? `${saved.title} was updated` : `${saved.title} was added`)
      await router.navigate({ to: '/tasks/$taskId', params: { taskId: saved.id } })
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        setServerErrors(z.flattenError(error).fieldErrors)
        setFormError('The request could not be validated')
        return
      }

      setServerErrors(fieldErrorsFrom(error))
      setFormError(error instanceof ApiRequestError ? error.message : 'The form could not be saved')
    },
  })

  const form = useForm({
    defaultValues: task ? valuesFrom(task) : emptyValues(defaultProjectId),
    onSubmit: async ({ value }) => {
      setServerErrors({})
      setFormError(null)
      await mutation.mutateAsync(value)
    },
  })

  const [projectId, setProjectId] = useState(task?.project.id ?? defaultProjectId ?? NONE)
  const projectSelected = projectId !== NONE
  const selectedProject = useQuery({
    ...projectQueryOptions(projectId),
    enabled: projectSelected,
  })
  const people = selectedProject.data ? assigneeOptions(selectedProject.data) : []

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

      <form.Field name="title">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Title</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.title)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.title?.[0]} />
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

      <form.Field name="projectId">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => {
                field.handleChange(value)
                setProjectId(value)
                form.setFieldValue('assignedTo', NONE)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>
                  Choose a project
                </SelectItem>
                {(projects.data?.items ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.projectId?.[0]} />
          </div>
        )}
      </form.Field>

      <form.Field name="assignedTo">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Assignee</Label>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
              disabled={!projectSelected || selectedProject.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={projectSelected ? 'Unassigned' : 'Choose a project first'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.assignedTo?.[0]} />
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

      <form.Field name="dueDate">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Due date</Label>
            <Input
              id={field.name}
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={Boolean(serverErrors.dueDate)}
            />
            <FieldMessage errors={field.state.meta.errors} server={serverErrors.dueDate?.[0]} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
