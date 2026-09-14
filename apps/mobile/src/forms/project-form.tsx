import { changedFields, hasChanges } from '@opsflow/types/changes'
import {
  createProjectSchema,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type ProjectDetail,
  updateProjectSchema,
} from '@opsflow/types/project'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { z } from 'zod'
import { Field } from '@/components/field'
import { FormScreen } from '@/components/form-screen'
import { Picker, type PickerOption } from '@/components/picker'
import { type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { clientKeys, clientsQueryOptions } from '@/lib/clients'
import { createProject, projectKeys, updateProject } from '@/lib/projects'
import { usersQueryOptions } from '@/lib/users'

const PRIORITY_OPTIONS = PRIORITY_LEVELS.map((level) => ({ value: level, label: level }))

/**
 * A cleared input is NaN rather than 0, so the schema refuses it instead of
 * quietly resetting the project to 0%.
 */
function progressNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text)
}

/** The edit form's wire shape for the project as loaded, to diff a submission against. */
function payloadFrom(project: ProjectDetail) {
  return {
    name: project.name,
    description: project.description ?? '',
    clientId: project.client?.id ?? null,
    managerId: project.manager?.id ?? null,
    startDate: project.startDate,
    deadline: project.deadline,
    progress: project.progress,
  }
}

/**
 * Create and edit share one form, as on the web. Status is never a field:
 * a new project starts in planning and moves from the project screen.
 * Priority is set here only on create, progress only on edit — a new
 * project has none to report.
 */
export function ProjectForm({ project }: { project?: ProjectDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = project !== undefined

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [clientId, setClientId] = useState(project?.client?.id ?? '')
  const [managerId, setManagerId] = useState(project?.manager?.id ?? '')
  const [priority, setPriority] = useState<PriorityLevel>(project?.priority ?? 'medium')
  const [progress, setProgress] = useState(String(project?.progress ?? 0))
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const clients = useQuery(clientsQueryOptions({ status: 'active', pageSize: 100 }))
  const people = useQuery(usersQueryOptions({ status: 'active', pageSize: 100 }))
  const managers: PickerOption[] = (people.data?.items ?? [])
    .filter((person) => person.role.name === 'admin' || person.role.name === 'manager')
    .map((person) => ({ value: person.id, label: person.name, hint: person.role.name }))
  const clientOptions = (clients.data?.items ?? []).map((client) => ({
    value: client.id,
    label: client.name,
    hint: client.company ?? undefined,
  }))

  // Only active clients and eligible managers are offered, but the ones on
  // file may no longer be either. They are still the answer saved on the
  // project, so the pickers show them rather than "No client" while the id
  // is still held.
  if (project?.client && !clientOptions.some((option) => option.value === project.client?.id)) {
    clientOptions.unshift({
      value: project.client.id,
      label: project.client.name,
      hint: 'No longer active',
    })
  }
  if (project?.manager && !managers.some((option) => option.value === project.manager?.id)) {
    managers.unshift({
      value: project.manager.id,
      label: project.manager.name,
      hint: 'No longer eligible',
    })
  }

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!isEdit) {
        return createProject(createProjectSchema.parse(payload))
      }

      // Only what changed goes over the wire. The API re-checks the client
      // and the manager whenever either key arrives, so resending them
      // unchanged would refuse a progress update on a project whose client
      // has since been archived.
      const changes = changedFields(payload, payloadFrom(project))

      return hasChanges(changes)
        ? updateProject(project.id, updateProjectSchema.parse(changes))
        : project
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(projectKeys.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })

      if (isEdit) {
        router.back()
      } else {
        router.replace({ pathname: '/projects/[projectId]', params: { projectId: saved.id } })
      }
    },
  })

  const errors: FieldErrorMap = { ...fieldErrorsFrom(save.error), ...fieldErrors }

  function submit() {
    const payload = {
      name,
      description,
      clientId: clientId === '' ? null : clientId,
      managerId: managerId === '' ? null : managerId,
      startDate: startDate === '' ? null : startDate,
      deadline: deadline === '' ? null : deadline,
      ...(isEdit ? { progress: progressNumber(progress) } : { priority }),
    }
    // Widened: create requires priority and update has progress, so TS cannot
    // infer one error type for z.flattenError from the union of the two.
    const parsed: z.ZodSafeParseResult<unknown> = isEdit
      ? updateProjectSchema.safeParse(payload)
      : createProjectSchema.safeParse(payload)

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
      title={isEdit ? `Edit ${project.name}` : 'Add a project'}
      description={
        isEdit
          ? 'Status and priority are changed from the project screen, not this form.'
          : 'A new project starts in planning. Status changes happen from the project screen.'
      }
      submitLabel={isEdit ? 'Save changes' : 'Add project'}
      pending={save.isPending}
      error={formError ?? (save.isError && Object.keys(errors).length === 0 ? save.error : null)}
      onSubmit={submit}
      onCancel={() => router.back()}
    >
      <Field label="Name" value={name} onChangeText={setName} errors={errors.name} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        errors={errors.description}
        placeholder="Optional"
        multiline
      />
      <Picker
        label="Client"
        value={clientId}
        options={clientOptions}
        onChange={setClientId}
        emptyLabel="No client"
        loading={clients.isPending}
        errors={errors.clientId}
      />
      <Picker
        label="Manager"
        value={managerId}
        options={managers}
        onChange={setManagerId}
        emptyLabel="Unassigned"
        loading={people.isPending}
        errors={errors.managerId}
      />
      {isEdit ? (
        <Field
          label="Progress (%)"
          value={progress}
          onChangeText={setProgress}
          errors={errors.progress}
          keyboardType="number-pad"
        />
      ) : (
        <Picker
          label="Priority"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(value) => setPriority(value as PriorityLevel)}
          errors={errors.priority}
        />
      )}
      <Field
        label="Start date"
        value={startDate}
        onChangeText={setStartDate}
        errors={errors.startDate}
        placeholder="YYYY-MM-DD, optional"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <Field
        label="Deadline"
        value={deadline}
        onChangeText={setDeadline}
        errors={errors.deadline}
        placeholder="YYYY-MM-DD, optional"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
    </FormScreen>
  )
}
