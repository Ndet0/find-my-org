import { type ClientDetail, createClientSchema, updateClientSchema } from '@opsflow/types/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { z } from 'zod'
import { Field } from '@/components/field'
import { FormScreen } from '@/components/form-screen'
import { type FieldErrorMap, fieldErrorsFrom } from '@/lib/api'
import { clientKeys, createClient, updateClient } from '@/lib/clients'

/**
 * Create and edit share one form. Status is never a field: a new client is
 * active, and archiving or deactivating is its own confirmed action on the
 * client screen, as on the web.
 */
export function ClientForm({ client }: { client?: ClientDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = client !== undefined

  const [name, setName] = useState(client?.name ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? updateClient(client.id, updateClientSchema.parse(payload))
        : createClient(createClientSchema.parse(payload)),
    onSuccess: async (saved) => {
      queryClient.setQueryData(clientKeys.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })

      if (isEdit) {
        router.back()
      } else {
        router.replace({ pathname: '/clients/[clientId]', params: { clientId: saved.id } })
      }
    },
  })

  const errors: FieldErrorMap = { ...fieldErrorsFrom(save.error), ...fieldErrors }

  function submit() {
    const payload = { name, company, email, phone, address, notes }
    const parsed = isEdit
      ? updateClientSchema.safeParse(payload)
      : createClientSchema.safeParse(payload)

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
      title={isEdit ? `Edit ${client.name}` : 'Add a client'}
      description={
        isEdit
          ? 'Status is changed from the client screen, not this form.'
          : 'A new client starts active.'
      }
      submitLabel={isEdit ? 'Save changes' : 'Add client'}
      pending={save.isPending}
      error={formError ?? (save.isError && Object.keys(errors).length === 0 ? save.error : null)}
      onSubmit={submit}
      onCancel={() => router.back()}
    >
      <Field label="Name" value={name} onChangeText={setName} errors={errors.name} />
      <Field
        label="Company"
        value={company}
        onChangeText={setCompany}
        errors={errors.company}
        placeholder="Optional"
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        errors={errors.email}
        placeholder="Optional"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
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
        label="Address"
        value={address}
        onChangeText={setAddress}
        errors={errors.address}
        placeholder="Optional"
        multiline
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        errors={errors.notes}
        placeholder="Optional"
        multiline
      />
    </FormScreen>
  )
}
