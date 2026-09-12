import { colors } from '@opsflow/ui/colors'
import { useColorScheme } from 'nativewind'
import { Text, TextInput, type TextInputProps, View } from 'react-native'
import { ErrorText } from '@/components/error-text'

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
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colorScheme === 'dark' ? colors.neutral[500] : colors.neutral[400]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        className={`rounded-lg border bg-white dark:bg-neutral-900 px-3 py-3 text-base text-neutral-900 dark:text-neutral-50 ${multiline ? 'min-h-28' : ''} ${message ? 'border-tone-danger-foreground' : 'border-neutral-300 dark:border-neutral-700'}`}
        {...props}
      />
      {message ? <ErrorText>{message}</ErrorText> : null}
    </View>
  )
}
