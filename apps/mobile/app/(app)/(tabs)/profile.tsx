import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { Button } from '@/components/button'
import { DetailRow } from '@/components/detail-row'
import { Screen } from '@/components/screen'
import { authClient } from '@/lib/auth-client'
import { currentUserQueryOptions, useCurrentUser } from '@/lib/current-user'

export default function ProfileScreen() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      // Nothing cached under the old session may survive into the next one.
      // The current user is set rather than removed so the root guard sees
      // "signed out" immediately instead of refetching first.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== currentUserQueryOptions.queryKey[0],
      })
      queryClient.setQueryData(currentUserQueryOptions.queryKey, null)
    },
  })

  if (!user) {
    return null
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text className="text-2xl font-semibold text-neutral-900">{user.name}</Text>
        <Text className="text-sm text-neutral-500">{user.email}</Text>
      </View>

      <View className="gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <DetailRow label="Role" value={user.role.name} capitalize />
        <DetailRow label="Department" value={user.department?.name ?? 'Unassigned'} />
        <DetailRow label="Position" value={user.position ?? 'Unassigned'} />
        <DetailRow label="Phone" value={user.phone ?? 'Not provided'} />
        <DetailRow label="Joined" value={user.joinedAt ?? 'Unknown'} />
      </View>

      <View className="mt-6">
        <Button
          title={signOut.isPending ? 'Signing out…' : 'Sign out'}
          variant="outline"
          disabled={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
        {signOut.isError ? (
          <Text className="mt-2 text-sm text-red-600">Sign-out failed. Try again.</Text>
        ) : null}
      </View>
    </Screen>
  )
}
