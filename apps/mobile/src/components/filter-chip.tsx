import { Pressable, ScrollView, Text } from 'react-native'

/** One pill in a filter row. */
export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${active ? 'border-neutral-900 dark:border-neutral-50 bg-neutral-900 dark:bg-neutral-50' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800'}`}
    >
      <Text
        className={`text-sm font-medium ${active ? 'text-white dark:text-neutral-900' : 'text-neutral-700 dark:text-neutral-300'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * A row of mutually exclusive chips. `Segmented` divides the width between
 * its options, which stops reading at three or four; a chip row scrolls
 * instead, so a filter with an option per entity type still fits a phone.
 */
export function ChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {options.map((option) => (
        <FilterChip
          key={option.value}
          label={option.label}
          active={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </ScrollView>
  )
}
