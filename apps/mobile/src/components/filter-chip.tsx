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
      className={`rounded-full border px-3 py-1.5 ${active ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white active:bg-neutral-100'}`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-neutral-700'}`}>
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
