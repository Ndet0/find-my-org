import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ErrorText } from '@/components/error-text'
import { describeError } from '@/components/message'
import { Screen } from '@/components/screen'

/**
 * The frame every create/edit screen shares: keyboard avoidance, a card
 * with a heading, the fields, one error line for anything that is not a
 * field error, and the save/cancel pair. Screens own their state and
 * validation; this only lays them out.
 */
export function FormScreen({
  title,
  description,
  children,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  title: string
  description?: string
  children: ReactNode
  submitLabel: string
  pending: boolean
  error?: unknown
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="py-4 pb-10" keyboardShouldPersistTaps="handled">
          <View className="gap-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                {title}
              </Text>
              {description ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  {description}
                </Text>
              ) : null}
            </View>

            <View className="gap-4">{children}</View>

            {error ? <ErrorText>{describeError(error)}</ErrorText> : null}

            <View className="gap-2">
              <Button
                title={pending ? 'Saving…' : submitLabel}
                disabled={pending}
                onPress={onSubmit}
              />
              <Button title="Cancel" variant="ghost" disabled={pending} onPress={onCancel} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
