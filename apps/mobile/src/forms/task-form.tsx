import { changedFields, hasChanges } from '@opsflow/types/changes'
import { PRIORITY_LEVELS, type PriorityLevel } from '@opsflow/types/project'
import { createTaskSchema, type TaskDetail, updateTaskSchema } from '@opsflow/types/task'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { z } from 'zod'
import { Field } from '@/components/field'
import { FormScreen } from '@/components/form-screen'
import { Picker } from '@/components/picker'
import { type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { projectKeys, projectQueryOptions, projectsQueryOptions } from '@/lib/projects'
import { createTask, taskKeys, updateTask } from '@/lib/tasks'

const PRIORITY_OPTIONS = PRIORITY_LEVELS.map((level) => ({ value: level, label: level }))

/**
 * Who a task on this project may be assigned to: the manager and the
 * members, deduplicated, exactly as the web form offers them.
 */
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

  return [...people.entries()].map(([value, label]) => ({ value, label }))
}

/** The edit form's wire shape for the task as loaded, to diff a submission against. */
function payloadFrom(task: TaskDetail) {
  return {
    title: task.title,
    description: task.description ?? '',
    projectId: task.project.id,
    assignedTo: task.assignee?.id ?? null,
    dueDate: task.dueDate,
  }
}

/**
 * Create and edit share one form, as on the web. Status is never a field:
 * a new task starts pending and moves through its states from the task
 * screen. Priority is set here only on create; afterwards it has its own
 * control next to the badge.
 */
export function TaskForm({
  task,
  defaultProjectId,
}: {
  task?: TaskDetail
  defaultProjectId?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = task !== undefined

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [projectId, setProjectId] = useState(task?.project.id ?? defaultProjectId ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assignee?.id ?? '')
  const [priority, setPriority] = useState<PriorityLevel>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const projects = useQuery(projectsQueryOptions({ pageSize: 100 }))
  const selectedProject = useQuery({
    ...projectQueryOptions(projectId),
    enabled: projectId !== '',
  })
  const people = selectedProject.data ? assigneeOptions(selectedProject.data) : []

  // The saved assignee may no longer be offered — deactivated, say. They are
  // still the answer on file, so the picker shows them rather than
  // "Unassigned" while the id is still held.
  if (task?.assignee && !people.some((option) => option.value === task.assignee?.id)) {
    people.unshift({ value: task.assignee.id, label: task.assignee.name })
  }

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!isEdit) {
        return createTask(createTaskSchema.parse(payload))
      }

      // Only what changed goes over the wire. The API re-checks the project
      // and the assignee whenever either key arrives, so resending them
      // unchanged would refuse a title fix on a task whose project has since
      // closed or whose assignee has since been deactivated.
      const changes = changedFields(payload, payloadFrom(task))

      return hasChanges(changes) ? updateTask(task.id, updateTaskSchema.parse(changes)) : task
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(taskKeys.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })

      if (isEdit) {
        router.back()
      } else {
        // Replace, so going back from the new task skips the empty form.
        router.replace({ pathname: '/tasks/[taskId]', params: { taskId: saved.id } })
      }
    },
  })

  // Local validation first; a 422 from the API lands on the same fields.
  const errors: FieldErrorMap = { ...fieldErrorsFrom(save.error), ...fieldErrors }

  function submit() {
    const payload = {
      title,
      description,
      projectId,
      assignedTo: assignedTo === '' ? null : assignedTo,
      dueDate: dueDate === '' ? null : dueDate,
      ...(isEdit ? {} : { priority }),
    }
    const parsed = isEdit
      ? updateTaskSchema.safeParse(payload)
      : createTaskSchema.safeParse(payload)

    if (!parsed.success) {
      const flat = z.flattenError(parsed.error)
      setFieldErrors(flat.fieldErrors)
      setFormError(flat.formErrors[0] ?? null)
      return
    }

    setFieldErrors({})
    setFormError(null)
    save.mutate(payload)
  }

  return (
    <FormScreen
      title={isEdit ? `Edit ${task.title}` : 'Add a task'}
      description={
        isEdit
          ? 'Status and priority are changed from the task screen, not this form.'
          : 'A new task starts as pending. Status changes happen from the task screen.'
      }
      submitLabel={isEdit ? 'Save changes' : 'Add task'}
      pending={save.isPending}
      error={formError ?? (save.isError && Object.keys(errors).length === 0 ? save.error : null)}
      onSubmit={submit}
      onCancel={() => router.back()}
    >
      <Field label="Title" value={title} onChangeText={setTitle} errors={errors.title} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        errors={errors.description}
        placeholder="Optional"
        multiline
      />
      <Picker
        label="Project"
        value={projectId}
        options={(projects.data?.items ?? []).map((project) => ({
          value: project.id,
          label: project.name,
          hint: project.client?.name,
        }))}
        onChange={(value) => {
          setProjectId(value)
          setAssignedTo('')
        }}
        placeholder="Choose a project"
        loading={projects.isPending}
        errors={errors.projectId}
      />
      <Picker
        label="Assignee"
        value={assignedTo}
        options={people}
        onChange={setAssignedTo}
        emptyLabel="Unassigned"
        disabled={projectId === ''}
        loading={projectId !== '' && selectedProject.isPending}
        errors={errors.assignedTo}
      />
      {isEdit ? null : (
        <Picker
          label="Priority"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(value) => setPriority(value as PriorityLevel)}
          errors={errors.priority}
        />
      )}
      <Field
        label="Due date"
        value={dueDate}
        onChangeText={setDueDate}
        errors={errors.dueDate}
        placeholder="YYYY-MM-DD, optional"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
    </FormScreen>
  )
}
