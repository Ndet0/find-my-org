import { ROLE_NAMES, type RoleName } from '@opsflow/types/permissions'
import { USER_STATUSES, type UserListItem, type UserStatus } from '@opsflow/types/user'
import { toneLabel } from '@opsflow/ui/tones'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ChipRow } from '@/components/filter-chip'
import { describeError, Message } from '@/components/message'
import { UserStatusBadge } from '@/components/status-badge'
import { useCan } from '@/lib/current-user'
import { usersQueryOptions } from '@/lib/users'

type RoleFilter = 'all' | RoleName
type StatusFilter = 'all' | UserStatus

/**
 * The people directory, for administrators and managers. Ordered by name on
 * the server, one page at the API's ceiling; the searchable, paged table
 * stays on the web, as does filtering by department.
 */
export default function UsersScreen() {
  const router = useRouter()
  const canWrite = useCan('users:write')
  const [role, setRole] = useState<RoleFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const users = useQuery(
    usersQueryOptions({
      pageSize: 100,
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
    }),
  )

  return (
    <View className="flex-1 bg-neutral-100 px-4">
      <View className="flex-row items-start justify-between gap-3 py-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold text-neutral-900">People</Text>
          <Text className="text-sm text-neutral-500">
            {users.data
              ? `${users.data.total} ${users.data.total === 1 ? 'person' : 'people'}`
              : 'Everyone in OPSflow'}
          </Text>
        </View>
        {canWrite ? (
          <Button title="Add" size="sm" onPress={() => router.push('/users/new')} />
        ) : null}
      </View>

      <View className="gap-2 pb-3">
        <ChipRow
          value={role}
          options={[
            { value: 'all' as const, label: 'All roles' },
            ...ROLE_NAMES.map((name) => ({ value: name, label: toneLabel(name) })),
          ]}
          onChange={setRole}
        />
        <ChipRow
          value={status}
          options={[
            { value: 'all' as const, label: 'Any status' },
            ...USER_STATUSES.map((value) => ({ value, label: toneLabel(value) })),
          ]}
          onChange={setStatus}
        />
      </View>

      {users.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : users.isError ? (
        <Message
          title="People could not be loaded"
          body={describeError(users.error)}
          onRetry={() => users.refetch()}
        />
      ) : (
        <FlatList
          data={users.data.items}
          keyExtractor={(user) => user.id}
          renderItem={({ item }) => <UserRow user={item} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            <Message
              title="Nobody here"
              body={
                canWrite && role === 'all' && status === 'all'
                  ? 'Add someone with the button above.'
                  : 'Nobody matches these filters.'
              }
            />
          }
          refreshControl={
            <RefreshControl refreshing={users.isRefetching} onRefresh={() => users.refetch()} />
          }
        />
      )}
    </View>
  )
}

function UserRow({ user }: { user: UserListItem }) {
  return (
    <Link href={{ pathname: '/users/[userId]', params: { userId: user.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        className="gap-2 rounded-xl border border-neutral-200 bg-white p-4 active:bg-neutral-50"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-medium text-neutral-900" numberOfLines={1}>
              {user.name}
            </Text>
            <Text className="text-sm text-neutral-500" numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <UserStatusBadge status={user.status} />
        </View>
        <Text className="text-xs text-neutral-500">
          {toneLabel(user.role.name)} · {user.department?.name ?? 'Unassigned'}
        </Text>
      </Pressable>
    </Link>
  )
}
