import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { THEMES, type Theme, useTheme } from '@/lib/theme'

const ICONS: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor }
const LABELS: Record<Theme, string> = { light: 'light', dark: 'dark', system: 'system' }

/**
 * One button that cycles light → dark → system. Three states in one control
 * keeps it the size of the profile icon beside it and needs no menu
 * primitive; the label says where you are and where the next press goes,
 * so a screen reader user is not left counting presses.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system'
  const Icon = ICONS[theme]

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  )
}
