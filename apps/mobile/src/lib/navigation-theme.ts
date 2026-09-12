import { colors } from '@opsflow/ui/colors'
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router'
import { useColorScheme } from 'nativewind'

/**
 * The navigators' own chrome — stack headers, the tab bar, the scene
 * container behind every screen — is native, not a NativeWind view, so it
 * does not read `dark:` classes. Expo Router themes it through React
 * Navigation's provider instead; these two themes put the same palette
 * steps the classes use behind that chrome, so a transition between screens
 * never shows a light frame in dark mode.
 */
const LIGHT: NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.neutral[900],
    background: colors.neutral[100],
    card: '#ffffff',
    text: colors.neutral[900],
    border: colors.neutral[200],
  },
}

const DARK: NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.neutral[50],
    background: colors.neutral[950],
    card: colors.neutral[900],
    text: colors.neutral[50],
    border: colors.neutral[800],
  },
}

export function useNavigationTheme(): NavigationTheme {
  const { colorScheme } = useColorScheme()
  return colorScheme === 'dark' ? DARK : LIGHT
}
