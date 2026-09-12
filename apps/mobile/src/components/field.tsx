import { colors } from '@opsflow/ui/colors'
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

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-800">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.neutral[400]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        className={`rounded-lg border bg-white px-3 py-3 text-base text-neutral-900 ${multiline ? 'min-h-28' : ''} ${message ? 'border-tone-danger-foreground' : 'border-neutral-300'}`}
        {...props}
      />
      {message ? <ErrorText>{message}</ErrorText> : null}
    </View>
  )
}
