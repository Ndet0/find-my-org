import { Text, View } from 'react-native'
import { Button } from '@/components/button'
import { ErrorText } from '@/components/error-text'
import { describeError } from '@/components/message'

/**
 * A confirmation rendered in place of the control that asked for it, rather
 * than a native alert: the same screen has to work on the web build used for
 * verification, and the question stays next to the record it concerns.
 */
export function InlineConfirm({
  message,
  confirmLabel,
  destructive,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  message: string
  confirmLabel: string
  destructive?: boolean
  pending: boolean
  error?: unknown
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <View className="gap-3">
      <Text className="text-sm text-neutral-700">{message}</Text>
      {error ? <ErrorText>{describeError(error)}</ErrorText> : null}
      <View className="flex-row gap-2">
        <Button
          title="Cancel"
          variant="outline"
          className="flex-1"
          disabled={pending}
          onPress={onCancel}
        />
        <Button
          title={pending ? 'Saving…' : confirmLabel}
          variant={destructive ? 'destructive' : 'primary'}
          className="flex-1"
          disabled={pending}
          onPress={onConfirm}
        />
      </View>
    </View>
  )
}
