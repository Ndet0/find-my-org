import { Pressable, Text, View } from 'react-native'

/** Two or three mutually exclusive views of the same list. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row rounded-lg bg-neutral-200 dark:bg-neutral-800 p-1">
      {options.map((option) => {
        const active = option.value === value

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-md py-1.5 ${active ? 'bg-white dark:bg-neutral-700' : ''}`}
          >
            <Text
              className={`text-sm font-medium ${active ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-600 dark:text-neutral-400'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
