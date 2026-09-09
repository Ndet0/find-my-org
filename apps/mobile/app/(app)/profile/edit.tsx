import { type UpdateProfileInput, updateProfileSchema } from '@opsflow/types/user'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { describeError } from '@/components/message'
import { Screen } from '@/components/screen'
import { fieldErrorsFrom } from '@/lib/api'
import { currentUserQueryOptions, updateProfile, useCurrentUser } from '@/lib/current-user'

type FieldErrors = { name?: string[]; phone?: string[] }

/**
 * The fields a person may change about themselves. Everything else on the
 * profile tab (email, role, department, position) belongs to an
 * administrator; the password has its own screen, because Better Auth owns
 * the hash rather than `PATCH /api/me`.
 */
export default function EditProfileScreen() {
  const user = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const save = useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (updated) => {
      // The global rule refreshes counts and notifications after any
      // mutation but does not touch the profile, so it is written here.
      queryClient.setQueryData(currentUserQueryOptions.queryKey, updated)
      router.back()
    },
  })

  if (!user) {
    return null
  }

  // Local validation first; a 422 from the API lands on the same fields.
  const errors: FieldErrors = { ...fieldErrorsFrom(save.error), ...fieldErrors }

  function submit() {
    const parsed = updateProfileSchema.safeParse({ name, phone })

    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }

    setFieldErrors({})
    save.mutate(parsed.data)
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="py-4" keyboardShouldPersistTaps="handled">
          <View className="gap-6 rounded-2xl border border-neutral-200 bg-white p-6">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-neutral-900">Your details</Text>
              <Text className="text-sm text-neutral-500">
                Email, role, department and position are managed by an administrator.
              </Text>
            </View>

            <View className="gap-4">
              <Field
                label="Name"
                value={name}
                onChangeText={setName}
                errors={errors.name}
                autoComplete="name"
                textContentType="name"
              />
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                errors={errors.phone}
                placeholder="Optional"
                autoComplete="tel"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                onSubmitEditing={submit}
              />
            </View>

            {save.isError ? (
              <Text className="text-sm text-red-600">{describeError(save.error)}</Text>
            ) : null}

            <View className="gap-2">
              <Button
                title={save.isPending ? 'Saving…' : 'Save changes'}
                disabled={save.isPending}
                onPress={submit}
              />
              <Button
                title="Cancel"
                variant="ghost"
                disabled={save.isPending}
                onPress={() => router.back()}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
