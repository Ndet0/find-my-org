import {
  createDepartmentSchema,
  type DepartmentListItem,
  updateDepartmentSchema,
} from '@opsflow/types/department'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { Field } from '@/components/field'
import { InlineConfirm } from '@/components/inline-confirm'
import { describeError, Message } from '@/components/message'
import { type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { useCan } from '@/lib/current-user'
import {
  createDepartment,
  deleteDepartment,
  departmentKeys,
  departmentsQueryOptions,
  updateDepartment,
} from '@/lib/departments'

/**
 * Departments are a handful of reference rows, so the whole module fits one
 * screen: the list, an inline form for adding or renaming, and an inline
 * delete confirmation. Reading needs `departments:read` (administrators and
 * managers); writing is an administrator's alone.
 */
export default function DepartmentsScreen() {
  const canWrite = useCan('departments:write')
  const departments = useQuery(departmentsQueryOptions)
  const [adding, setAdding] = useState(false)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-neutral-100"
    >
      <ScrollView
        contentContainerClassName="gap-3 px-4 py-4 pb-10"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={departments.isRefetching}
            onRefresh={() => departments.refetch()}
          />
        }
      >
        <View className="flex-row items-start justify-between gap-3 pb-1">
          <View className="flex-1 gap-1">
            <Text className="text-2xl font-semibold text-neutral-900">Departments</Text>
            <Text className="text-sm text-neutral-500">
              {departments.data
                ? `${departments.data.length} ${departments.data.length === 1 ? 'department' : 'departments'}`
                : 'A label on people, not a permission boundary'}
            </Text>
          </View>
          {canWrite && !adding ? (
            <Button title="Add" size="sm" onPress={() => setAdding(true)} />
          ) : null}
        </View>

        {adding ? <DepartmentForm onDone={() => setAdding(false)} /> : null}

        {departments.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" />
          </View>
        ) : departments.isError ? (
          <Message
            title="Departments could not be loaded"
            body={describeError(departments.error)}
            onRetry={() => departments.refetch()}
          />
        ) : departments.data.length === 0 ? (
          <Message
            title="No departments yet"
            body={canWrite ? 'Add one with the button above.' : undefined}
          />
        ) : (
          departments.data.map((department) => (
            <DepartmentRow key={department.id} department={department} canWrite={canWrite} />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function DepartmentRow({
  department,
  canWrite,
}: {
  department: DepartmentListItem
  canWrite: boolean
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')

  if (mode === 'edit') {
    return <DepartmentForm department={department} onDone={() => setMode('view')} />
  }

  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-medium text-neutral-900">{department.name}</Text>
          <Text className="text-sm text-neutral-500">{department.description ?? '—'}</Text>
        </View>
        <Text className="text-xs text-neutral-500">
          {department.memberCount} {department.memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {canWrite && mode === 'view' ? (
        <View className="flex-row gap-2">
          <Button title="Edit" variant="outline" size="sm" onPress={() => setMode('edit')} />
          <Button title="Delete" variant="ghost" size="sm" onPress={() => setMode('delete')} />
        </View>
      ) : null}

      {mode === 'delete' ? (
        <DeleteControl department={department} onDone={() => setMode('view')} />
      ) : null}
    </Card>
  )
}

/** Add or rename. Both validate against the shared schema before the request. */
function DepartmentForm({
  department,
  onDone,
}: {
  department?: DepartmentListItem
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = department !== undefined
  const [name, setName] = useState(department?.name ?? '')
  const [description, setDescription] = useState(department?.description ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})

  const save = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      isEdit
        ? updateDepartment(department.id, updateDepartmentSchema.parse(payload))
        : createDepartment(createDepartmentSchema.parse(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })
      onDone()
    },
  })

  const errors: FieldErrorMap = { ...fieldErrorsFrom(save.error), ...fieldErrors }

  function submit() {
    const payload = { name, description }
    const parsed = isEdit
      ? updateDepartmentSchema.safeParse(payload)
      : createDepartmentSchema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }

    setFieldErrors({})
    save.mutate(payload)
  }

  return (
    <Card>
      <Text className="text-base font-semibold text-neutral-900">
        {isEdit ? `Edit ${department.name}` : 'Add a department'}
      </Text>
      <Field label="Name" value={name} onChangeText={setName} errors={errors.name} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        errors={errors.description}
        placeholder="Optional"
        multiline
      />
      {save.isError && Object.keys(errors).length === 0 ? (
        <Text className="text-sm text-red-600">{describeError(save.error)}</Text>
      ) : null}
      <View className="flex-row gap-2">
        <Button
          title="Cancel"
          variant="outline"
          className="flex-1"
          disabled={save.isPending}
          onPress={onDone}
        />
        <Button
          title={save.isPending ? 'Saving…' : isEdit ? 'Save' : 'Add'}
          className="flex-1"
          disabled={save.isPending}
          onPress={submit}
        />
      </View>
    </Card>
  )
}

/**
 * The API refuses to delete a department that still has members (409), so
 * the confirmation says so up front and offers no button to press.
 */
function DeleteControl({
  department,
  onDone,
}: {
  department: DepartmentListItem
  onDone: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteDepartment(department.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })

  if (department.memberCount > 0) {
    return (
      <View className="gap-2">
        <Text className="text-sm text-neutral-700">
          {`This department still has ${department.memberCount} ${department.memberCount === 1 ? 'member' : 'members'}. Reassign them on the web before deleting it.`}
        </Text>
        <Button title="Close" variant="outline" size="sm" onPress={onDone} />
      </View>
    )
  }

  return (
    <InlineConfirm
      message={`Delete ${department.name}? This cannot be undone.`}
      confirmLabel="Delete"
      destructive
      pending={mutation.isPending}
      error={mutation.error}
      onCancel={() => {
        mutation.reset()
        onDone()
      }}
      onConfirm={() => mutation.mutate()}
    />
  )
}
