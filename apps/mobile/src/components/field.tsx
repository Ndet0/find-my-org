import { Text, TextInput, type TextInputProps, View } from 'react-native'

/** A labelled input with the first validation message underneath it. */
export function Field({
  label,
  errors,
  ...props
}: TextInputProps & { label: string; errors?: string[] }) {
  const message = errors?.[0]

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-800">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#a3a3a3"
        className={`rounded-lg border bg-white px-3 py-3 text-base text-neutral-900 ${message ? 'border-red-500' : 'border-neutral-300'}`}
        {...props}
      />
      {message ? <Text className="text-sm text-red-600">{message}</Text> : null}
    </View>
  )
}
