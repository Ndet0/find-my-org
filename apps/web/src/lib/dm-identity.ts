import type { KeyPair } from '@opsflow/crypto'
import {
  type IdentityRemote,
  type IdentityStore,
  loadIdentity,
  refreshBackup,
  rewrapIdentity,
  unlockIdentity,
} from '@opsflow/crypto/identity'
import type { DmKeyInput } from '@opsflow/types/dm'
import { queryOptions } from '@tanstack/react-query'
import { fetchOwnKey, forgetOpenedMessages, saveOwnKey } from '@/lib/dm'

/**
 * This browser's copy of the person's messaging secret. `localStorage`,
 * keyed by user id so two people who share a browser do not share a key,
 * and cleared when the session ends. The lifecycle itself — first-time
 * generation, restoring from the password-wrapped backup, re-wrapping after
 * a password change — is `@opsflow/crypto/identity`; this file only
 * supplies the storage and the API calls.
 */

const PREFIX = 'opsflow.dm.secret.'

/**
 * Set when a password change went through but the backup could not be
 * re-sealed under the new password. Until it is cleared, no other device
 * can unlock, so the Messages page asks for the password and retries.
 */
const STALE_PREFIX = 'opsflow.dm.backup-stale.'

const store: IdentityStore = {
  read: async (userId) => localStorage.getItem(PREFIX + userId),
  write: async (userId, secretKey) => localStorage.setItem(PREFIX + userId, secretKey),
  remove: async (userId) => localStorage.removeItem(PREFIX + userId),
}

const remote: IdentityRemote = {
  fetch: fetchOwnKey,
  save: (record, password) =>
    saveOwnKey({ ...record, ...(password ? { currentPassword: password } : {}) } as DmKeyInput),
}

/** Read from storage, never refetched: the only writes go through the functions below. */
export const identityQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['dm', 'identity', userId] as const,
    queryFn: () => loadIdentity(userId, store),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

export function unlockMessaging(userId: string, password: string): Promise<KeyPair> {
  return unlockIdentity({ userId, password, store, remote })
}

export function rewrapMessaging(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return rewrapIdentity({ userId, currentPassword, newPassword, store, remote })
}

export const staleBackupQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['dm', 'backup-stale', userId] as const,
    queryFn: async () => localStorage.getItem(STALE_PREFIX + userId) === '1',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

export function markBackupStale(userId: string): void {
  localStorage.setItem(STALE_PREFIX + userId, '1')
}

/**
 * The retry for a failed re-wrap: seals this browser's secret under the
 * account password and uploads it. Resolves false when this browser has no
 * secret to seal, in which case unlocking first is the way back.
 */
export async function refreshMessagingBackup(userId: string, password: string): Promise<boolean> {
  const refreshed = await refreshBackup({ userId, password, store, remote })

  if (refreshed) {
    localStorage.removeItem(STALE_PREFIX + userId)
  }

  return refreshed
}

/**
 * Every secret this browser holds, whoever it belongs to, and every key and
 * text derived from one. For sign-out, and for a session that ended
 * underneath the app: the next person to sign in here must start clean.
 * The stale-backup marks stay: they hold no secret, and the person they
 * belong to still has a backup to fix when they are next here.
 */
export function forgetMessagingSecrets(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) {
      localStorage.removeItem(key)
    }
  }

  forgetOpenedMessages()
}
