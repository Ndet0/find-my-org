import type { ReactNode } from 'react'
import { Pressable, type PressableProps, View } from 'react-native'

type Padding = 'md' | 'lg'

/**
 * One radius, one border, one surface: the panel every screen composes its
 * content from. `md` is a record or a list row; `lg` is a form, which
 * breathes more because its fields already carry their own labels.
 */
const SURFACE =
  'rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'

const PADDING: Record<Padding, string> = {
  md: 'gap-3 p-4',
  lg: 'gap-6 p-6',
}

export function Card({
  children,
  className,
  padding = 'md',
}: {
  children: ReactNode
  className?: string
  padding?: Padding
}) {
  return <View className={`${SURFACE} ${PADDING[padding]} ${className ?? ''}`}>{children}</View>
}

/**
 * The same panel as a list row that opens a record. Carries the press state
 * and the button role, so a row never re-spells the card's classes to add
 * them. No default gap: rows decide their own rhythm.
 */
export function PressableCard({ className, ...props }: PressableProps & { className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`${SURFACE} p-4 active:bg-neutral-50 dark:active:bg-neutral-800 ${className ?? ''}`}
      {...props}
    />
  )
}
