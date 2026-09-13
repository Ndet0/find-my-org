import type { ClientListItem, ClientStatus } from '@opsflow/types/client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { PressableCard } from '@/components/card'
import { ListFooter } from '@/components/list-footer'
import { describeError, Message } from '@/components/message'
import { Segmented } from '@/components/segmented'
import { ClientStatusBadge } from '@/components/status-badge'
import { clientsInfiniteQueryOptions } from '@/lib/clients'
import { useCan } from '@/lib/current-user'
import { flattenPages, loadMore, pagedCountLabel, pagedTotal } from '@/lib/paged'

type Filter = 'all' | ClientStatus

/**
 * The client directory, for administrators and managers. Ordered by name
 * on the server and loaded a page at a time as the list reaches its end;
 * the searchable table stays on the web.
 */
export default function ClientsScreen() {
  const router = useRouter()
  const canWrite = useCan('clients:write')
  const [filter, setFilter] = useState<Filter>('all')
  const clients = useInfiniteQuery(
    clientsInfiniteQueryOptions(filter === 'all' ? {} : { status: filter }),
  )
  const items = flattenPages(clients.data)

  return (
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
      <View className="flex-row items-start justify-between gap-3 py-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Clients
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {pagedCountLabel(items.length, pagedTotal(clients.data), 'client', 'clients') ??
              'Who the work is for'}
          </Text>
        </View>
        {canWrite ? (
          <Button title="Add" size="sm" onPress={() => router.push('/clients/new')} />
        ) : null}
      </View>

      <View className="pb-3">
        <Segmented
          value={filter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'archived', label: 'Archived' },
          ]}
          onChange={setFilter}
        />
      </View>

      {clients.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : clients.isError && items.length === 0 ? (
        <Message
          title="Clients could not be loaded"
          body={describeError(clients.error)}
          onRetry={() => clients.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(client) => client.id}
          renderItem={({ item }) => <ClientRow client={item} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          onEndReached={loadMore(clients)}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            <ListFooter
              loading={clients.isFetchingNextPage}
              failed={clients.isFetchNextPageError}
            />
          }
          ListEmptyComponent={
            <Message
              title="No clients here"
              body={
                canWrite && filter === 'all'
                  ? 'Add one with the button above.'
                  : 'Nothing matches this filter.'
              }
            />
          }
          refreshControl={
            <RefreshControl refreshing={clients.isRefetching} onRefresh={() => clients.refetch()} />
          }
        />
      )}
    </View>
  )
}

function ClientRow({ client }: { client: ClientListItem }) {
  return (
    <Link href={{ pathname: '/clients/[clientId]', params: { clientId: client.id } }} asChild>
      <PressableCard className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text
              className="text-base font-medium text-neutral-900 dark:text-neutral-50"
              numberOfLines={1}
            >
              {client.name}
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
              {client.company ?? 'No company'}
            </Text>
          </View>
          <ClientStatusBadge status={client.status} />
        </View>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {client.projectCount} {client.projectCount === 1 ? 'project' : 'projects'}
          {client.email ? ` · ${client.email}` : ''}
        </Text>
      </PressableCard>
    </Link>
  )
}
