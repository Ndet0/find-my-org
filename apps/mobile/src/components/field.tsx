import { colors } from '@opsflow/ui/colors'
import { useColorScheme } from 'nativewind'
import type { ReactNode } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'
import { ErrorText } from '@/components/error-text'

/** The classes a form control shares with `Picker`'s trigger, which is styled to look like one. */
export const CONTROL_CLASSES =
  'rounded-lg border bg-white dark:bg-neutral-900 px-3 py-3 text-base text-neutral-900 dark:text-neutral-50'

export function controlBorder(invalid: boolean): string {
  return invalid ? 'border-tone-danger-foreground' : 'border-neutral-300 dark:border-neutral-700'
}

/**
 * The label above and the first validation message below any form control.
 * `Field` and `Picker` both render inside it, so a field and a picker in the
 * same form line up and report a problem the same way.
 */
export function FieldFrame({
  label,
  message,
  children,
}: {
  label: string
  message?: string
  children: ReactNode
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</Text>
      {children}
      {message ? <ErrorText>{message}</ErrorText> : null}
    </View>
  )
}

/** A labelled input with the first validation message underneath it. */
export function Field({
  label,
  errors,
  multiline,
  ...props
}: TextInputProps & { label: string; errors?: string[] }) {
  const message = errors?.[0]
  const { colorScheme } = useColorScheme()

  return (
    <FieldFrame label={label} message={message}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colorScheme === 'dark' ? colors.neutral[500] : colors.neutral[400]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        className={`${CONTROL_CLASSES} ${multiline ? 'min-h-28' : ''} ${controlBorder(Boolean(message))}`}
        {...props}
      />
    </FieldFrame>
  )
}
