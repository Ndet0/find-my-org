import { Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ApiRequestError } from '@/lib/api'

/** Centred feedback for an empty or failed screen. */
export function Message({
  title,
  body,
  onRetry,
}: {
  title: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-12">
      <Text className="text-base font-medium text-neutral-800 dark:text-neutral-200">{title}</Text>
      {body ? (
        <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">{body}</Text>
      ) : null}
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} /> : null}
    </View>
  )
}

export function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) {
      return 'This record does not exist or is not part of your work.'
    }

    if (error.status === 403) {
      return 'Your role does not have permission to view this.'
    }

    return error.message
  }

  return error instanceof Error ? error.message : 'Something went wrong.'
}
