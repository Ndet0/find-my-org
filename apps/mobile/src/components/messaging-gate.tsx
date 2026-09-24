import { DmCryptoError, type KeyPair } from '@opsflow/crypto'
import type { CurrentUser } from '@opsflow/types/user'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { ErrorText } from '@/components/error-text'
import { Field } from '@/components/field'
import { ApiRequestError } from '@/lib/api'
import {
  identityQueryOptions,
  refreshMessagingBackup,
  staleBackupQueryOptions,
  unlockMessaging,
} from '@/lib/dm-identity'

const IdentityContext = createContext<KeyPair | null>(null)

/** The signed-in person's key pair. Only rendered inside a `MessagingGate`. */
export function useIdentity(): KeyPair {
  const identity = useContext(IdentityContext)

  if (!identity) {
    throw new Error('useIdentity must be used inside MessagingGate')
  }

  return identity
}

/**
 * Nothing in Messages renders without the person's secret key on this
 * phone. Sign-in normally puts it there; a session that predates the
 * feature or a failed unlock lands here, and the password does the rest.
 * The password only unwraps the backup, or wraps a new key, on the device.
 *
 * A backup left sealed under an old password — a password change whose
 * re-wrap failed — is fixed from here too: the key is on this phone, and
 * the current password seals it again.
 */
export function MessagingGate({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const queryClient = useQueryClient()
  const identity = useQuery(identityQueryOptions(user.id))
  const stale = useQuery(staleBackupQueryOptions(user.id))
  const [password, setPassword] = useState('')

  const unlock = useMutation({
    mutationFn: () => unlockMessaging(user.id, password),
    onSuccess: (pair) => {
      setPassword('')
      queryClient.setQueryData(identityQueryOptions(user.id).queryKey, pair)
    },
  })

  if (identity.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (identity.data) {
    return (
      <IdentityContext value={identity.data}>
        {stale.data ? <StaleBackupNotice userId={user.id} /> : null}
        {children}
      </IdentityContext>
    )
  }

  return (
    <Card padding="lg" className="mt-4">
      <View className="gap-1">
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Unlock secure messaging
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          Your messages are end-to-end encrypted with a key that lives on your devices. Enter your
          password to unlock it here.
        </Text>
      </View>

      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        onSubmitEditing={() => password && unlock.mutate()}
      />

      {unlock.isError ? (
        <ErrorText>{describeUnlockError(unlock.error, stale.data === true)}</ErrorText>
      ) : null}

      <Button
        title={unlock.isPending ? 'Unlocking…' : 'Unlock'}
        disabled={!password || unlock.isPending}
        onPress={() => unlock.mutate()}
      />
    </Card>
  )
}

/** The retry for a re-wrap that failed after a password change. */
function StaleBackupNotice({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')

  const refresh = useMutation({
    mutationFn: () => refreshMessagingBackup(userId, password),
    onSuccess: async () => {
      setPassword('')
      await queryClient.invalidateQueries({ queryKey: staleBackupQueryOptions(userId).queryKey })
    },
  })

  return (
    <Card padding="lg" className="mb-3">
      <View className="gap-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Your messaging backup needs updating
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          Your password changed, but the backup that lets your other devices read your messages is
          still sealed under the old one. Enter your current password to update it.
        </Text>
      </View>

      <Field
        label="Current password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        onSubmitEditing={() => password && refresh.mutate()}
      />

      {refresh.isError ? (
        <ErrorText>
          {refresh.error instanceof ApiRequestError
            ? refresh.error.message
            : 'The backup could not be updated.'}
        </ErrorText>
      ) : null}

      <Button
        title={refresh.isPending ? 'Updating…' : 'Update backup'}
        variant="outline"
        disabled={!password || refresh.isPending}
        onPress={() => refresh.mutate()}
      />
    </Card>
  )
}

export function describeUnlockError(error: unknown, backupIsStale = false): string {
  if (error instanceof DmCryptoError) {
    switch (error.code) {
      case 'WRONG_PASSWORD':
        return backupIsStale
          ? 'That password does not unlock your messages. Your backup was sealed before your password changed, so try the previous one.'
          : 'That password does not unlock your messages. Use the password you sign in with.'
      case 'KEY_MISMATCH':
        return 'Your stored messaging key is damaged. Contact an administrator.'
      default:
        return error.message
    }
  }

  return error instanceof ApiRequestError
    ? error.message
    : 'Secure messaging could not be unlocked.'
}
