import { Text, View } from 'react-native'

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <View
      className="flex-row items-center gap-2"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <View className="h-full rounded-full bg-neutral-900" style={{ width: `${clamped}%` }} />
      </View>
      <Text className="w-10 text-right text-xs text-neutral-500">{clamped}%</Text>
    </View>
  )
}
