import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { THEMES, type Theme, useTheme } from '@/lib/theme'

const ICONS: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor }
const LABELS: Record<Theme, string> = { light: 'light', dark: 'dark', system: 'system' }

/**
 * One floating button, bottom-right of every signed-in page, that cycles
 * light → dark → system. It floats rather than sitting in the sidebar
 * because an icon beside Sign out was not found; one round control in one
 * place is what the mobile dashboard shows too. The label says where you
 * are and where the next press goes, so a screen reader user is not left
 * counting presses.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system'
  const Icon = ICONS[theme]

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed right-4 bottom-4 z-40 size-11 rounded-full shadow-lg md:right-6 md:bottom-6"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  )
}
