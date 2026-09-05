import '../global.css'

import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { Message } from '@/components/message'
import { currentUserQueryOptions } from '@/lib/current-user'
import { queryClient } from '@/lib/query-client'

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <RootNavigator />
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

  if (user.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (user.isError) {
    return (
      <View className="flex-1 bg-neutral-100 px-6">
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
