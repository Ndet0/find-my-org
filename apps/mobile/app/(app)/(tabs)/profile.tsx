import { Ionicons } from '@expo/vector-icons'
import { colors } from '@opsflow/ui/colors'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Href, Link, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { DetailRow } from '@/components/detail-row'
import { Screen } from '@/components/screen'
import { authClient } from '@/lib/auth-client'
import { currentUserQueryOptions, useCan, useCurrentUser } from '@/lib/current-user'

export default function ProfileScreen() {
  const user = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const canReadUsers = useCan('users:read')
  const canReadClients = useCan('clients:read')
  const canReadDepartments = useCan('departments:read')
  const canReadActivity = useCan('activity:read')

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

  // The modules with no tab of their own, each shown only to the roles that
  // may read it. Every role holds `activity:read`, so the card itself is
  // never empty in practice — the length check is what guards that, rather
  // than a chain of permission flags that has to be kept in step.
  const directory: { title: string; body: string; to: Href; visible: boolean }[] = [
    { title: 'People', body: 'Everyone in OPSflow', to: '/users', visible: canReadUsers },
    { title: 'Clients', body: 'Who the work is for', to: '/clients', visible: canReadClients },
    {
      title: 'Departments',
      body: 'The org chart',
      to: '/departments',
      visible: canReadDepartments,
    },
    { title: 'Activity', body: 'What changed', to: '/activity', visible: canReadActivity },
  ].filter((entry) => entry.visible)

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

      {directory.length > 0 ? (
        <View className="mt-4 gap-2">
          <Text className="text-sm font-medium text-neutral-500">Directory</Text>
          <View className="rounded-xl border border-neutral-200 bg-white">
            {directory.map((entry, index) => (
              <View key={entry.title}>
                {index > 0 ? <View className="h-px bg-neutral-200" /> : null}
                <DirectoryLink title={entry.title} body={entry.body} to={entry.to} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        <Button title="Edit profile" onPress={() => router.push('/profile/edit')} />
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

/** One row of the directory card: the modules that have no tab of their own. */
function DirectoryLink({ title, body, to }: { title: string; body: string; to: Href }) {
  return (
    <Link href={to} asChild>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center justify-between gap-3 px-4 py-3 active:bg-neutral-50"
      >
        <View className="gap-0.5">
          <Text className="text-base font-medium text-neutral-900">{title}</Text>
          <Text className="text-sm text-neutral-500">{body}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
      </Pressable>
    </Link>
  )
}
