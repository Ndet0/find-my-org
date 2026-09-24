import '../global.css'

import { focusManager, QueryClientProvider, useQuery } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useEffect, useState } from 'react'
import { ActivityIndicator, AppState, Platform, View } from 'react-native'
import { Message } from '@/components/message'
import { currentUserQueryOptions } from '@/lib/current-user'
import { useNavigationTheme } from '@/lib/navigation-theme'
import { queryClient } from '@/lib/query-client'
import { loadTheme } from '@/lib/theme'

// Hermes has no WebCrypto. `@opsflow/crypto` draws its randomness — key
// pairs, nonces, salts — from `globalThis.crypto.getRandomValues`, so the
// native implementation is installed there before any screen can ask for it.
// The web build already has the browser's.
if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: { getRandomValues: Crypto.getRandomValues },
    configurable: true,
  })
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme()
  const navigationTheme = useNavigationTheme()

  // Query only knows about window focus in a browser. Telling it when the
  // app goes to the background pauses the polled queries — the open thread,
  // the inbox, the badges — and refetches them when the app comes back,
  // which is what the web gets from the tab's visibility for free.
  useEffect(() => {
    if (Platform.OS === 'web') return

    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active')
    })
    return () => subscription.remove()
  }, [])

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
