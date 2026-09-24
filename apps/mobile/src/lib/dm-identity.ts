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
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { fetchOwnKey, forgetOpenedMessages, saveOwnKey } from '@/lib/dm'

/**
 * This phone's copy of the person's messaging secret, in SecureStore — the
 * keychain on iOS, the keystore on Android — under the same key scheme as
 * the web's `localStorage`. The lifecycle is `@opsflow/crypto/identity`;
 * this file only supplies the storage and the API calls.
 */

const PREFIX = 'opsflow.dm.secret.'

/**
 * Set when a password change went through but the backup could not be
 * re-sealed under the new password. Until it is cleared, no other device
 * can unlock, so the Messages tab asks for the password and retries.
 */
const STALE_PREFIX = 'opsflow.dm.backup-stale.'

async function read(key: string): Promise<string | null> {
  return Platform.OS === 'web' ? localStorage.getItem(key) : SecureStore.getItemAsync(key)
}

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') localStorage.setItem(key, value)
  else await SecureStore.setItemAsync(key, value)
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web') localStorage.removeItem(key)
  else await SecureStore.deleteItemAsync(key)
}

const store: IdentityStore = {
  read: (userId) => read(PREFIX + userId),
  write: (userId, secretKey) => write(PREFIX + userId, secretKey),
  remove: (userId) => remove(PREFIX + userId),
}

const remote: IdentityRemote = {
  fetch: fetchOwnKey,
  save: (record, password) =>
    saveOwnKey({ ...record, ...(password ? { currentPassword: password } : {}) } as DmKeyInput),
}

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
    queryFn: async () => (await read(STALE_PREFIX + userId)) === '1',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

export function markBackupStale(userId: string): Promise<void> {
  return write(STALE_PREFIX + userId, '1')
}

/**
 * The retry for a failed re-wrap: seals this phone's secret under the
 * account password and uploads it. Resolves false when this phone has no
 * secret to seal, in which case unlocking first is the way back.
 */
export async function refreshMessagingBackup(userId: string, password: string): Promise<boolean> {
  const refreshed = await refreshBackup({ userId, password, store, remote })

  if (refreshed) {
    await remove(STALE_PREFIX + userId)
  }

  return refreshed
}

/**
 * For sign-out, and for a session that ended underneath the app. SecureStore
 * cannot be enumerated, so the owner is named; the keys and texts derived
 * from the secret go regardless. The stale-backup mark stays: it holds no
 * secret, and the person still has a backup to fix when they are next here.
 */
export async function forgetMessagingSecret(userId: string | null | undefined): Promise<void> {
  if (userId) {
    await store.remove(userId).catch(() => undefined)
  }

  forgetOpenedMessages()
}
