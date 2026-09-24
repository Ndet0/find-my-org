import { type ChangePasswordInput, changePasswordSchema } from '@opsflow/types/auth'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { ErrorText } from '@/components/error-text'
import { Field } from '@/components/field'
import { describeError } from '@/components/message'
import { Screen } from '@/components/screen'
import { authClient } from '@/lib/auth-client'
import { useCurrentUser } from '@/lib/current-user'
import { markBackupStale, rewrapMessaging } from '@/lib/dm-identity'

type FieldErrors = {
  currentPassword?: string[]
  newPassword?: string[]
  confirmPassword?: string[]
}

/**
 * Better Auth's error code for a current password that does not match. It is
 * the one failure that belongs on a field rather than in the error line.
 */
const INVALID_PASSWORD = 'INVALID_PASSWORD'

/**
 * Changing your own password. This is the one account operation a person may
 * perform on themselves; everything else about the account — email, role,
 * department, position, status — belongs to an administrator.
 *
 * It does not go through `PATCH /api/me`. Better Auth owns the hash and the
 * credential row, so the change goes to its own endpoint, which is also the
 * only thing that can verify the current password before replacing it.
 */
export default function ChangePasswordScreen() {
  const router = useRouter()
  const user = useCurrentUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const change = useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const { error } = await authClient.changePassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        // A password is usually changed because the old one is no longer
        // trusted, so the sessions it opened elsewhere go with it. Better
        // Auth issues this device a fresh session cookie in the same
        // response, which the Expo client stores; only the other devices
        // are signed out.
        revokeOtherSessions: true,
      })

      if (error) {
        if (error.code === INVALID_PASSWORD) {
          setFieldErrors({ currentPassword: ['That is not your current password'] })
          throw new Error('Check your current password and try again')
        }

        throw new Error(error.message ?? 'The password could not be changed')
      }

      // The messaging key's backup is sealed under the password, so it is
      // re-sealed under the new one; otherwise the next device could not
      // unlock it. The password has already changed, so a failure here is
      // not a refusal: this phone keeps its copy, the failure is remembered,
      // and the Messages tab asks for the password to retry.
      if (user) {
        return rewrapMessaging(user.id, input.currentPassword, input.newPassword).then(
          () => true,
          async () => {
            await markBackupStale(user.id).catch(() => undefined)
            return false
          },
        )
      }

      return true
    },
    onSuccess: () => {
      // Nothing on the profile tab changes, so the screen says so itself
      // rather than returning to a tab that looks untouched.
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
  })

  function submit() {
    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })

    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }

    setFieldErrors({})
    change.mutate(parsed.data)
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="py-4 pb-10" keyboardShouldPersistTaps="handled">
          <Card padding="lg">
            {change.isSuccess ? (
              <>
                <View className="gap-1">
                  <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Password changed
                  </Text>
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    Use the new password next time you sign in. Any other device you were signed in
                    on has been signed out.
                  </Text>
                  {change.data === false ? (
                    <ErrorText>
                      Your secure-messaging backup could not be updated. Open Messages on this phone
                      to retry; until then, other devices cannot unlock your messages.
                    </ErrorText>
                  ) : null}
                </View>
                <Button title="Done" onPress={() => router.back()} />
              </>
            ) : (
              <>
                <View className="gap-1">
                  <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                    Change password
                  </Text>
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    Confirm the password you use now, then choose a new one.
                  </Text>
                </View>

                <View className="gap-4">
                  <Field
                    label="Current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    errors={fieldErrors.currentPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    secureTextEntry
                  />
                  <Field
                    label="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    errors={fieldErrors.newPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    secureTextEntry
                  />
                  <Field
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    errors={fieldErrors.confirmPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    secureTextEntry
                    onSubmitEditing={submit}
                  />
                </View>

                {change.isError ? <ErrorText>{describeError(change.error)}</ErrorText> : null}

                <View className="gap-2">
                  <Button
                    title={change.isPending ? 'Saving…' : 'Change password'}
                    disabled={change.isPending}
                    onPress={submit}
                  />
                  <Button
                    title="Cancel"
                    variant="ghost"
                    disabled={change.isPending}
                    onPress={() => router.back()}
                  />
                </View>
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
