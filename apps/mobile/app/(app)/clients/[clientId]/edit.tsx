import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { describeError, Message } from '@/components/message'
import { ClientForm } from '@/forms/client-form'
import { clientQueryOptions } from '@/lib/clients'

export default function EditClientScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>()
  const client = useQuery(clientQueryOptions(clientId))

  if (client.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (client.isError) {
    return (
      <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
        <Message
          title="Client unavailable"
          body={describeError(client.error)}
          onRetry={() => client.refetch()}
        />
      </View>
    )
  }

  return <ClientForm client={client.data} />
}
