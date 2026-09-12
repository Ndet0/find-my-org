import '../global.css'

import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Message } from '@/components/message'
import { currentUserQueryOptions } from '@/lib/current-user'
import { useNavigationTheme } from '@/lib/navigation-theme'
import { queryClient } from '@/lib/query-client'
import { loadTheme } from '@/lib/theme'

export default function RootLayout() {
  const { colorScheme } = useColorScheme()
  const navigationTheme = useNavigationTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

/**
 * The mobile equivalent of the web's `/_authed` guard. The API decides
 * whether there is a usable session; the answer selects which stack exists,
 * and Expo Router moves the user when a guard flips (sign-in, sign-out, or
 * a 401 surfacing from any screen).
 */
function RootNavigator() {
  const user = useQuery(currentUserQueryOptions)
  // The stored preference is read once, before anything with a `dark:`
  // class mounts, so a dark session does not open on a light frame. The
  // pending branch below is what shows meanwhile — the same one the user
  // request already needs.
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    void loadTheme().finally(() => setThemeReady(true))
  }, [])

  if (user.isPending || !themeReady) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (user.isError) {
    return (
      <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-6">
        <Message
          title="OPSflow could not be reached"
          body={user.error.message}
          onRetry={() => user.refetch()}
        />
      </View>
    )
  }

  const signedIn = user.data !== null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  )
}
