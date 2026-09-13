import { ROLE_NAMES, type RoleName } from '@opsflow/types/permissions'
import { USER_STATUSES, type UserListItem, type UserStatus } from '@opsflow/types/user'
import { toneLabel } from '@opsflow/ui/tones'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { PressableCard } from '@/components/card'
import { ChipRow } from '@/components/filter-chip'
import { ListFooter } from '@/components/list-footer'
import { describeError, Message } from '@/components/message'
import { UserStatusBadge } from '@/components/status-badge'
import { useCan } from '@/lib/current-user'
import { flattenPages, loadMore, pagedCountLabel, pagedTotal } from '@/lib/paged'
import { usersInfiniteQueryOptions } from '@/lib/users'

type RoleFilter = 'all' | RoleName
type StatusFilter = 'all' | UserStatus

/**
 * The people directory, for administrators and managers. Ordered by name on
 * the server and loaded a page at a time as the list reaches its end; the
 * searchable table stays on the web, as does filtering by department.
 */
export default function UsersScreen() {
  const router = useRouter()
  const canWrite = useCan('users:write')
  const [role, setRole] = useState<RoleFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const users = useInfiniteQuery(
    usersInfiniteQueryOptions({
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
    }),
  )
  const items = flattenPages(users.data)

  return (
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
      <View className="flex-row items-start justify-between gap-3 py-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            People
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {pagedCountLabel(items.length, pagedTotal(users.data), 'person', 'people') ??
              'Everyone in OPSflow'}
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
      ) : users.isError && items.length === 0 ? (
        <Message
          title="People could not be loaded"
          body={describeError(users.error)}
          onRetry={() => users.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(user) => user.id}
          renderItem={({ item }) => <UserRow user={item} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          onEndReached={loadMore(users)}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            <ListFooter loading={users.isFetchingNextPage} failed={users.isFetchNextPageError} />
          }
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
      <PressableCard className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text
              className="text-base font-medium text-neutral-900 dark:text-neutral-50"
              numberOfLines={1}
            >
              {user.name}
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <UserStatusBadge status={user.status} />
        </View>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {toneLabel(user.role.name)} · {user.department?.name ?? 'Unassigned'}
        </Text>
      </PressableCard>
    </Link>
  )
}
