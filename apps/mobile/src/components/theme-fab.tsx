import { Ionicons } from '@expo/vector-icons'
import { colors } from '@opsflow/ui/colors'
import { useColorScheme } from 'nativewind'
import { Pressable } from 'react-native'
import { THEMES, type Theme, useTheme } from '@/lib/theme'

const ICONS: Record<Theme, React.ComponentProps<typeof Ionicons>['name']> = {
  light: 'sunny-outline',
  dark: 'moon-outline',
  system: 'phone-portrait-outline',
}

/**
 * The floating theme control on the dashboard: one round button that cycles
 * light → dark → system and shows the current mode. It mirrors the web's
 * `ThemeToggle`, down to the label that names the current and the next
 * mode. Positioned by `Screen`'s gutter view, whose padding is inside it,
 * so `right-4` is what lines up with the cards above.
 */
export function ThemeFab() {
  const { theme, setTheme } = useTheme()
  const { colorScheme } = useColorScheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Theme: ${theme}. Switch to ${next}`}
      onPress={() => setTheme(next)}
      className="absolute right-4 bottom-4 h-12 w-12 items-center justify-center rounded-full bg-neutral-900 dark:bg-neutral-50 shadow-lg active:opacity-80"
    >
      <Ionicons
        name={ICONS[theme]}
        size={22}
        color={colorScheme === 'dark' ? colors.neutral[900] : colors.neutral[50]}
      />
    </Pressable>
  )
}
