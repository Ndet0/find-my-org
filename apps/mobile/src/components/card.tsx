import type { ReactNode } from 'react'
import { View } from 'react-native'

/** The white panel every screen composes its content from. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 ${className ?? ''}`}
    >
      {children}
    </View>
  )
}
