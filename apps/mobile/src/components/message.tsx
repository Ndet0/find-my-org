import { Text, View } from 'react-native'
import { Button } from '@/components/button'

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

// Lives in `lib/errors.ts`, where it can be tested; re-exported for its callers.
export { describeError } from '@/lib/errors'
