import { colors } from '@opsflow/ui/colors'
import { useColorScheme } from 'nativewind'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/** The frame every screen shares: safe area, background, horizontal gutter. */
export function Screen({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme()

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colorScheme === 'dark' ? colors.neutral[950] : colors.neutral[100],
      }}
      edges={['top', 'left', 'right']}
    >
      <View className="flex-1 px-4">{children}</View>
    </SafeAreaView>
  )
}
