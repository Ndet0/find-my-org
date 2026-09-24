import { DmCryptoError, type KeyPair } from '@opsflow/crypto'
import type { CurrentUser } from '@opsflow/types/user'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, type FormEvent, type ReactNode, useContext, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
 * device. Sign-in normally puts it there; a session that predates the
 * feature, a cleared browser or a failed unlock lands here instead, and
 * the password does the rest. The password goes nowhere: it only unwraps
 * the backup, or wraps a new key, in this tab.
 *
 * A backup left sealed under an old password — a password change whose
 * re-wrap failed — is fixed from here too: the key is on this device, and
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
      <output className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </output>
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password) unlock.mutate()
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Unlock secure messaging</CardTitle>
        <CardDescription>
          Your messages are end-to-end encrypted with a key that lives on your devices. Enter your
          password to unlock it here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {unlock.isError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {describeUnlockError(unlock.error, stale.data === true)}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="messaging-password">Password</Label>
            <Input
              id="messaging-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={!password || unlock.isPending} className="self-start">
            {unlock.isPending ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>
      </CardContent>
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
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base">Your messaging backup needs updating</CardTitle>
        <CardDescription>
          Your password changed, but the backup that lets your other devices read your messages is
          still sealed under the old one. Enter your current password to update it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (password) refresh.mutate()
          }}
          noValidate
          className="flex flex-wrap items-end gap-3"
        >
          {refresh.isError ? (
            <p role="alert" className="basis-full text-sm text-destructive">
              {refresh.error instanceof ApiRequestError
                ? refresh.error.message
                : 'The backup could not be updated.'}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="backup-password">Current password</Label>
            <Input
              id="backup-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={!password || refresh.isPending}>
            {refresh.isPending ? 'Updating…' : 'Update backup'}
          </Button>
        </form>
      </CardContent>
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
