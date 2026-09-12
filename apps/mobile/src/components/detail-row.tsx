import { Text, View } from 'react-native'

/** One label/value line of a record card. */
export function DetailRow({
  label,
  value,
  tone = 'default',
  capitalize,
}: {
  label: string
  value: string
  tone?: 'default' | 'alert'
  capitalize?: boolean
}) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text
        className={`flex-1 text-right text-sm ${tone === 'alert' ? 'text-tone-danger-foreground' : 'text-neutral-900'} ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
      </Text>
    </View>
  )
}
