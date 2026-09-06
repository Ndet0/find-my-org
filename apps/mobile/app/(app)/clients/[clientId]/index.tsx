import { CLIENT_STATUSES, type ClientStatus } from '@opsflow/types/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { DetailRow } from '@/components/detail-row'
import { InlineConfirm } from '@/components/inline-confirm'
import { describeError, Message } from '@/components/message'
import { ClientStatusBadge } from '@/components/status-badge'
import { clientKeys, clientQueryOptions, updateClientStatus } from '@/lib/clients'
import { useCan } from '@/lib/current-user'

const ACTION: Record<ClientStatus, string> = {
  active: 'Reactivate',
  inactive: 'Deactivate',
  archived: 'Archive',
}

export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>()
  const router = useRouter()
  const canWrite = useCan('clients:write')
  const client = useQuery(clientQueryOptions(clientId))

  if (client.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (client.isError) {
    return (
      <View className="flex-1 bg-neutral-100 px-4">
        <Message
          title="Client unavailable"
          body={describeError(client.error)}
          onRetry={() => client.refetch()}
        />
      </View>
    )
  }

  const { data } = client

  return (
    <ScrollView className="flex-1 bg-neutral-100" contentContainerClassName="gap-4 p-4 pb-10">
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xl font-semibold text-neutral-900">{data.name}</Text>
            <Text className="text-sm text-neutral-500">{data.company ?? 'No company'}</Text>
          </View>
          {canWrite ? (
            <Button
              title="Edit"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/clients/[clientId]/edit',
                  params: { clientId: data.id },
                })
              }
            />
          ) : null}
        </View>
        <View className="flex-row">
          <ClientStatusBadge status={data.status} />
        </View>
      </Card>

      <Card>
        <DetailRow label="Email" value={data.email ?? 'Not provided'} />
        <DetailRow label="Phone" value={data.phone ?? 'Not provided'} />
        <DetailRow label="Projects" value={String(data.projectCount)} />
        <DetailRow label="Added" value={data.createdAt.slice(0, 10)} />
        <View className="gap-1">
          <Text className="text-sm text-neutral-500">Address</Text>
          <Text className="text-sm text-neutral-900">{data.address ?? 'Not provided'}</Text>
        </View>
        <View className="gap-1">
          <Text className="text-sm text-neutral-500">Notes</Text>
          <Text className="text-sm text-neutral-900">{data.notes ?? 'None'}</Text>
        </View>
      </Card>

      {canWrite ? (
        <StatusControl
          clientId={data.id}
          name={data.name}
          projectCount={data.projectCount}
          current={data.status}
        />
      ) : null}
    </ScrollView>
  )
}

/**
 * Archive, deactivate or reactivate. The projects note is the same as the
 * web dialog's: a client's projects stay in the system whatever happens to
 * the client's status.
 */
function StatusControl({
  clientId,
  name,
  projectCount,
  current,
}: {
  clientId: string
  name: string
  projectCount: number
  current: ClientStatus
}) {
  const queryClient = useQueryClient()
  const [next, setNext] = useState<ClientStatus | null>(null)

  const mutation = useMutation({
    mutationFn: (status: ClientStatus) => updateClientStatus(clientId, { status }),
    onSuccess: async (saved) => {
      setNext(null)
      queryClient.setQueryData(clientKeys.detail(clientId), saved)
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })

  const projectsNote =
    projectCount === 0
      ? 'Their records stay in the directory.'
      : projectCount === 1
        ? 'Their one project stays in the system.'
        : `Their ${projectCount} projects stay in the system.`

  return (
    <Card>
      <Text className="text-sm font-medium text-neutral-800">Change status</Text>
      {next ? (
        <InlineConfirm
          message={
            next === 'active'
              ? `${ACTION[next]} ${name}? They will appear as an active client again.`
              : `${ACTION[next]} ${name}? They will no longer appear as an active client. ${projectsNote}`
          }
          confirmLabel={ACTION[next]}
          destructive={next !== 'active'}
          pending={mutation.isPending}
          error={mutation.error}
          onCancel={() => {
            mutation.reset()
            setNext(null)
          }}
          onConfirm={() => mutation.mutate(next)}
        />
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {CLIENT_STATUSES.filter((status) => status !== current).map((status) => (
            <Button
              key={status}
              title={ACTION[status]}
              variant={status === 'active' ? 'outline' : 'destructive'}
              size="sm"
              onPress={() => setNext(status)}
            />
          ))}
        </View>
      )}
    </Card>
  )
}
