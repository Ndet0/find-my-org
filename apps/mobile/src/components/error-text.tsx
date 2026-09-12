import type { ReactNode } from 'react'
import { Text } from 'react-native'

/**
 * The one line every screen uses to say a request or a field failed. It
 * reads in the danger tone rather than a stock red so the ink is the same
 * one the badges use, and it announces itself to a screen reader, which the
 * bare `<Text>` it replaced never did.
 */
export function ErrorText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      accessibilityRole="alert"
      className={`text-sm text-tone-danger-foreground ${className ?? ''}`}
    >
      {children}
    </Text>
  )
}
