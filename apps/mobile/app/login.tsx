import { type SignInInput, signInSchema } from '@opsflow/types/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { currentUserQueryOptions, fetchCurrentUser } from '@/lib/current-user'

type FieldErrors = { email?: string[]; password?: string[] }

export default function LoginScreen() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const signIn = useMutation({
    mutationFn: async (credentials: SignInInput) => {
      const { error } = await authClient.signIn.email(credentials)

      if (error) {
        throw new Error(error.message ?? 'Those credentials were not accepted')
      }

      // Better Auth authenticates, but only /api/me knows whether the account
      // is still active. Until that succeeds the session is unusable, so it
      // is discarded rather than left in SecureStore to fail on every screen.
      try {
        const user = await fetchCurrentUser()

        if (!user) {
          throw new Error('The session was not accepted by the API')
        }

        return user
      } catch (cause) {
        await authClient.signOut()
        throw cause
      }
    },
    // Writing the user into the cache is what flips the root guard.
    onSuccess: (user) => queryClient.setQueryData(currentUserQueryOptions.queryKey, user),
  })

  function submit() {
    const parsed = signInSchema.safeParse({ email, password })

    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }

    setFieldErrors({})
    signIn.mutate(parsed.data)
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center py-8"
          keyboardShouldPersistTaps="handled"
        >
          <Card padding="lg">
            <View className="gap-1">
              <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                Sign in to OPSflow
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Use your work email to access your workspace.
              </Text>
            </View>

            <View className="gap-4">
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                errors={fieldErrors.email}
                placeholder="you@opsflow.local"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                errors={fieldErrors.password}
                autoComplete="current-password"
                textContentType="password"
                secureTextEntry
                onSubmitEditing={submit}
              />
            </View>

            {signIn.isError ? <ErrorText>{describeError(signIn.error)}</ErrorText> : null}

            <Button
              title={signIn.isPending ? 'Signing in…' : 'Sign in'}
              disabled={signIn.isPending}
              onPress={submit}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
