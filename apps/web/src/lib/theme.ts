import { useSyncExternalStore } from 'react'

/**
 * The colour-scheme preference. `system` follows the operating system and
 * is the default, so a user who never touches the control gets what the
 * rest of their desktop looks like. The key and the union are the same on
 * mobile (`apps/mobile/src/lib/theme.ts`); only the storage differs.
 *
 * The preference is applied as a `.dark` class on `<html>`, which is what
 * `app.css`'s `dark` variant and the generated `.dark` tone block key on.
 * `index.html` applies it once more before the bundle loads, so a dark
 * session never paints a white frame first.
 */
export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'opsflow.theme'
export const THEMES: readonly Theme[] = ['light', 'dark', 'system']

const query = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? (query.matches ? 'dark' : 'light') : theme
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  // Native form controls and scrollbars follow this, not the class.
  document.documentElement.style.colorScheme = resolved
}

/** Re-applies the stored preference and tells every subscriber. */
function sync(): void {
  applyTheme(readTheme())
  for (const listener of listeners) listener()
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {
    // Private mode with storage disabled: the choice lasts for the session.
  }
  sync()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// A `system` session follows the OS as it changes. The change event covers
// a live switch; the visibility one covers a switch made while this tab was
// in the background, and a preference edited in another tab of the app.
query.addEventListener('change', sync)
document.addEventListener('visibilitychange', sync)
window.addEventListener('storage', (event) => {
  if (event.key === null || event.key === THEME_STORAGE_KEY) sync()
})

export function useTheme(): {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
} {
  const theme = useSyncExternalStore(subscribe, readTheme)
  const resolved = useSyncExternalStore(subscribe, () => resolveTheme(readTheme()))
  return { theme, resolved, setTheme }
}
