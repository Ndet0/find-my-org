import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { THEMES, type Theme, useTheme } from '@/lib/theme'

const ICONS: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor }
const LABELS: Record<Theme, string> = { light: 'light', dark: 'dark', system: 'system' }

/**
 * Cycles light → dark → system. It lives in the top bar and the sidebar
 * settings group so it stays reachable without covering the corner where
 * toasts appear.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system'
  const Icon = ICONS[theme]

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <Icon className="size-4" aria-hidden />
      <span className="capitalize">{LABELS[theme]}</span>
    </Button>
  )
}
