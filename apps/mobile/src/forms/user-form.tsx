import { changedFields, hasChanges } from '@opsflow/types/changes'
import { ROLE_NAMES, type RoleName } from '@opsflow/types/permissions'
import { createUserSchema, type UserDetail, updateUserSchema } from '@opsflow/types/user'
import { toneLabel } from '@opsflow/ui/tones'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { z } from 'zod'
import { Field } from '@/components/field'
import { FormScreen } from '@/components/form-screen'
import { Picker } from '@/components/picker'
import { type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { departmentKeys, departmentsQueryOptions } from '@/lib/departments'
import { createUser, updateUser, userKeys } from '@/lib/users'

const ROLE_OPTIONS = ROLE_NAMES.map((name) => ({ value: name, label: toneLabel(name) }))

/** The edit form's wire shape for the person as loaded, to diff a submission against. */
function payloadFrom(user: UserDetail) {
  return {
    name: user.name,
    email: user.email,
    role: user.role.name,
    position: user.position ?? '',
    phone: user.phone ?? '',
    departmentId: user.department?.id ?? null,
    joinedAt: user.joinedAt,
  }
}

/**
 * Create and edit share one form. The password is a create-only field:
 * there is no invite email, so an administrator hands the initial password
 * over and the person changes it later. Status is not a field either — it
 * is a confirmed action on the person's screen, as on the web.
 *
 * The role picker stays visible when you edit yourself. The API refuses a
 * self-demotion with a 403, which lands on the form's error line; hiding
 * the control would quietly differ from the web and hide the rule. Only the
 * fields that changed are sent, so leaving the role alone never trips it.
 */
export function UserForm({ user }: { user?: UserDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = user !== undefined
  const departments = useQuery(departmentsQueryOptions)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleName>(user?.role.name ?? 'employee')
  const [departmentId, setDepartmentId] = useState(user?.department?.id ?? '')
  const [position, setPosition] = useState(user?.position ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [joinedAt, setJoinedAt] = useState(user?.joinedAt ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!isEdit) {
        return createUser(createUserSchema.parse(payload))
      }

      // Only what changed goes over the wire. The API refuses a self-edit
      // that carries a role and logs a role change for any role it is sent,
      // so resending the whole form would 403 an admin fixing their own
      // phone number and record changes that never happened.
      const changes = changedFields(payload, payloadFrom(user))

      return hasChanges(changes) ? updateUser(user.id, updateUserSchema.parse(changes)) : user
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(userKeys.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
      // Head-counts on the departments screen move when someone joins or leaves one.
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })

      if (isEdit) {
        router.back()
      } else {
        router.replace({ pathname: '/users/[userId]', params: { userId: saved.id } })
      }
    },
  })

  const errors: FieldErrorMap = { ...fieldErrorsFrom(save.error), ...fieldErrors }

  function submit() {
    const payload = {
      name,
      email,
      role,
      position,
      phone,
      departmentId: departmentId === '' ? null : departmentId,
      joinedAt: joinedAt === '' ? null : joinedAt,
      ...(isEdit ? {} : { password }),
    }
    const parsed = isEdit
      ? updateUserSchema.safeParse(payload)
      : createUserSchema.safeParse(payload)

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
      title={isEdit ? `Edit ${user.name}` : 'Add a person'}
      description={
        isEdit
          ? 'Role and department changes take effect on their next request.'
          : 'They will sign in with the email and initial password you set here.'
      }
      submitLabel={isEdit ? 'Save changes' : 'Add person'}
      pending={save.isPending}
      error={formError ?? (save.isError && Object.keys(errors).length === 0 ? save.error : null)}
      onSubmit={submit}
      onCancel={() => router.back()}
    >
      <Field label="Name" value={name} onChangeText={setName} errors={errors.name} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        errors={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      {isEdit ? null : (
        <Field
          label="Initial password"
          value={password}
          onChangeText={setPassword}
          errors={errors.password}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      )}
      <Picker
        label="Role"
        value={role}
        options={ROLE_OPTIONS}
        onChange={(value) => setRole(value as RoleName)}
        errors={errors.role}
      />
      <Picker
        label="Department"
        value={departmentId}
        options={(departments.data ?? []).map((department) => ({
          value: department.id,
          label: department.name,
        }))}
        onChange={setDepartmentId}
        emptyLabel="Unassigned"
        loading={departments.isPending}
        errors={errors.departmentId}
      />
      <Field
        label="Position"
        value={position}
        onChangeText={setPosition}
        errors={errors.position}
        placeholder="Optional"
      />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        errors={errors.phone}
        placeholder="Optional"
        keyboardType="phone-pad"
      />
      <Field
        label="Joined"
        value={joinedAt}
        onChangeText={setJoinedAt}
        errors={errors.joinedAt}
        placeholder="YYYY-MM-DD, optional"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </FormScreen>
  )
}
