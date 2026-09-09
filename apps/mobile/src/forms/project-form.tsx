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
import { Picker } from '@/components/picker'
import { type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { clientKeys, clientsQueryOptions } from '@/lib/clients'
import { createProject, projectKeys, updateProject } from '@/lib/projects'
import { usersQueryOptions } from '@/lib/users'

const PRIORITY_OPTIONS = PRIORITY_LEVELS.map((level) => ({ value: level, label: level }))

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
  const managers = (people.data?.items ?? [])
    .filter((person) => person.role.name === 'admin' || person.role.name === 'manager')
    .map((person) => ({ value: person.id, label: person.name, hint: person.role.name }))

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? updateProject(project.id, updateProjectSchema.parse(payload))
        : createProject(createProjectSchema.parse(payload)),
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
      ...(isEdit ? { progress } : { priority }),
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
        options={(clients.data?.items ?? []).map((client) => ({
          value: client.id,
          label: client.name,
          hint: client.company ?? undefined,
        }))}
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
