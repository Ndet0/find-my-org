import { Ionicons } from '@expo/vector-icons'
import { colors } from '@opsflow/ui/colors'
import { useColorScheme } from 'nativewind'
import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ErrorText } from '@/components/error-text'

export type PickerOption = { value: string; label: string; hint?: string }

/**
 * A single-choice control for a foreign key or an enum. The trigger looks
 * like a `Field`; the options open in a bottom sheet, which is the same on
 * iOS, Android and the web build, so there is no per-platform picker to
 * verify. `emptyLabel` adds a "none" row that reports `''`, for nullable
 * columns such as a project's client.
 */
export function Picker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose',
  emptyLabel,
  errors,
  disabled,
  loading,
}: {
  label: string
  value: string
  options: PickerOption[]
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  errors?: string[]
  disabled?: boolean
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { colorScheme } = useColorScheme()
  const ink = colorScheme === 'dark' ? colors.neutral[50] : colors.neutral[900]
  const inkMuted = colorScheme === 'dark' ? colors.neutral[400] : colors.neutral[500]
  const message = errors?.[0]
  const selected = options.find((option) => option.value === value)
  const rows: PickerOption[] = emptyLabel ? [{ value: '', label: emptyLabel }, ...options] : options

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled ?? false, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-lg border bg-white dark:bg-neutral-900 px-3 py-3 ${message ? 'border-tone-danger-foreground' : 'border-neutral-300 dark:border-neutral-700'} ${disabled ? 'opacity-50' : ''}`}
      >
        <Text
          className={`flex-1 text-base ${selected ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400 dark:text-neutral-500'}`}
          numberOfLines={1}
        >
          {loading ? 'Loading…' : selected ? selected.label : (emptyLabel ?? placeholder)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={inkMuted} />
      </Pressable>
      {message ? <ErrorText>{message}</ErrorText> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Close"
          className="flex-1 justify-end bg-black/40"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="max-h-[70%] rounded-t-2xl bg-white dark:bg-neutral-900 pb-8"
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {label}
              </Text>
              <Button title="Done" variant="ghost" size="sm" onPress={() => setOpen(false)} />
            </View>
            <FlatList
              data={rows}
              keyExtractor={(option) => option.value || '__none__'}
              ListEmptyComponent={
                <Text className="px-4 py-6 text-sm text-neutral-500 dark:text-neutral-400">
                  Nothing to choose from.
                </Text>
              }
              renderItem={({ item }) => {
                const active = item.value === value

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(item.value)
                      setOpen(false)
                    }}
                    className="flex-row items-center justify-between gap-3 px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-base ${active ? 'font-semibold text-neutral-900 dark:text-neutral-50' : 'text-neutral-800 dark:text-neutral-200'}`}
                      >
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    {active ? <Ionicons name="checkmark" size={20} color={ink} /> : null}
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
