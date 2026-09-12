import { USER_STATUSES, type UserStatus } from '@opsflow/types/user'
import { toneLabel } from '@opsflow/ui/tones'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { DetailRow } from '@/components/detail-row'
import { InlineConfirm } from '@/components/inline-confirm'
import { describeError, Message } from '@/components/message'
import { UserStatusBadge } from '@/components/status-badge'
import { useCan, useCurrentUser } from '@/lib/current-user'
import { updateUserStatus, userKeys, userQueryOptions } from '@/lib/users'

const ACTION: Record<UserStatus, string> = {
  active: 'Reactivate',
  inactive: 'Deactivate',
  suspended: 'Suspend',
}

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const router = useRouter()
  const canWrite = useCan('users:write')
  const actor = useCurrentUser()
  const user = useQuery(userQueryOptions(userId))

  if (user.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (user.isError) {
    return (
      <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
        <Message
          title="Person unavailable"
          body={describeError(user.error)}
          onRetry={() => user.refetch()}
        />
      </View>
    )
  }

  const { data } = user

  return (
    <ScrollView
      className="flex-1 bg-neutral-100 dark:bg-neutral-950"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {data.name}
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">{data.email}</Text>
          </View>
          {canWrite ? (
            <Button
              title="Edit"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({ pathname: '/users/[userId]/edit', params: { userId: data.id } })
              }
            />
          ) : null}
        </View>
        <View className="flex-row">
          <UserStatusBadge status={data.status} />
        </View>
      </Card>

      <Card>
        <DetailRow label="Role" value={data.role.name} capitalize />
        <DetailRow label="Department" value={data.department?.name ?? 'Unassigned'} />
        <DetailRow label="Position" value={data.position ?? 'Unassigned'} />
        <DetailRow label="Phone" value={data.phone ?? 'Not provided'} />
        <DetailRow label="Joined" value={data.joinedAt ?? 'Unknown'} />
      </Card>

      {/* The API refuses a caller's own status change, so the control is not
          offered on your own record — the same courtesy the web performs. */}
      {canWrite && actor?.id !== data.id ? (
        <StatusControl userId={data.id} name={data.name} current={data.status} />
      ) : null}
    </ScrollView>
  )
}

/**
 * Activate, deactivate or suspend. Every refusal the API makes — including
 * the 409 that keeps one active administrator in the organisation — is
 * shown inline, next to the button that asked for it, rather than being
 * predicted here.
 */
function StatusControl({
  userId,
  name,
  current,
}: {
  userId: string
  name: string
  current: UserStatus
}) {
  const queryClient = useQueryClient()
  const [next, setNext] = useState<UserStatus | null>(null)

  const mutation = useMutation({
    mutationFn: (status: UserStatus) => updateUserStatus(userId, { status }),
    onSuccess: async (saved) => {
      setNext(null)
      queryClient.setQueryData(userKeys.detail(userId), saved)
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })

  return (
    <Card>
      <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Change status
      </Text>
      {next ? (
        <InlineConfirm
          message={
            next === 'active'
              ? `${ACTION[next]} ${name}? They will be able to sign in again.`
              : `${ACTION[next]} ${name}? They will be signed out and refused at the door until this is undone.`
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
          {USER_STATUSES.filter((status) => status !== current).map((status) => (
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
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">
        Currently {toneLabel(current).toLowerCase()}.
      </Text>
    </Card>
  )
}
