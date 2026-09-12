import * as SecureStore from 'expo-secure-store'
import { colorScheme } from 'nativewind'
import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'

/**
 * The colour-scheme preference: the same union and key as the web
 * (`apps/web/src/lib/theme.ts`), so a person reads the same three words on
 * both. `system` follows the device and is the default.
 *
 * NativeWind owns the application: `colorScheme.set()` flips every `dark:`
 * variant in one pass, and on a phone accepts `system` itself through the
 * Appearance API. Its web build does not — with the class strategy,
 * `system` only removes the class — so there `system` is resolved here from
 * `prefers-color-scheme` and followed as it changes. This module otherwise
 * only owns the persistence and the current value for the control on the
 * profile tab. SecureStore is already the app's storage for the session;
 * the web build has no SecureStore, so it uses `localStorage` under the
 * same key.
 */
export type Theme = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'opsflow.theme'
export const THEMES: readonly Theme[] = ['light', 'dark', 'system']

let current: Theme = 'system'
const listeners = new Set<() => void>()
const media = Platform.OS === 'web' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

async function readStored(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(THEME_STORAGE_KEY)
  }
  return SecureStore.getItemAsync(THEME_STORAGE_KEY)
}

async function writeStored(theme: Theme): Promise<void> {
  if (Platform.OS === 'web') {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, theme)
    return
  }
  if (theme === 'system') await SecureStore.deleteItemAsync(THEME_STORAGE_KEY)
  else await SecureStore.setItemAsync(THEME_STORAGE_KEY, theme)
}

function apply(theme: Theme): void {
  current = theme
  if (media && theme === 'system') {
    colorScheme.set(media.matches ? 'dark' : 'light')
  } else {
    colorScheme.set(theme)
  }
  for (const listener of listeners) listener()
}

media?.addEventListener('change', () => {
  if (current === 'system') apply('system')
})

/** Reads the stored preference and applies it. Called once, before the navigator renders. */
export async function loadTheme(): Promise<Theme> {
  let stored: string | null = null
  try {
    stored = await readStored()
  } catch {
    // Storage unavailable: the session runs on the device setting.
  }
  const theme = isTheme(stored) ? stored : 'system'
  apply(theme)
  return theme
}

export function setTheme(theme: Theme): void {
  apply(theme)
  void writeStored(theme).catch(() => {
    // The choice still holds for this session.
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The stored preference, for the control that edits it. For the resolved scheme use NativeWind's `useColorScheme`. */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, () => current)
  return { theme, setTheme }
}
