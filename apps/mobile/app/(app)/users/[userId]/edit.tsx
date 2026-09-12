import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { describeError, Message } from '@/components/message'
import { UserForm } from '@/forms/user-form'
import { userQueryOptions } from '@/lib/users'

export default function EditUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
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

  return <UserForm user={user.data} />
}
