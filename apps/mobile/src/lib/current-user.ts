import { can, type Permission } from '@opsflow/types/permissions'
import type { CurrentUser, UpdateProfileInput } from '@opsflow/types/user'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiRequestError, apiFetch } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { CURRENT_USER_KEY } from '@/lib/session'

/**
 * `/api/me` is the client's single source of truth for authentication, as
 * on the web: it answers "is there a session" and "is the account still
 * active" in one round trip, and it is the server's answer rather than a
 * guess from whatever is in SecureStore.
 *
 * Unlike the web client, a missing session resolves to `null` instead of
 * throwing. The root layout switches between the login and app stacks on
 * this value, and "signed out" is a normal state there, not an error.
 *
 * A 403 is the API refusing a session that still exists because the account
 * has been suspended or deactivated. Kept, the stored cookie would answer
 * every retry the same way and leave the phone on an error screen with no
 * way out, so the session is dropped and the login screen takes over. The
 * sign-out is best effort: the cookie is cleared locally before the request
 * is sent, which is all that matters here.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiFetch<CurrentUser>('/me')
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null
    }

    if (error instanceof ApiRequestError && error.status === 403) {
      await authClient.signOut().catch(() => undefined)
      return null
    }

    throw error
  }
}

export const currentUserQueryOptions = queryOptions({
  queryKey: [CURRENT_USER_KEY],
  queryFn: fetchCurrentUser,
  retry: false,
  staleTime: 5 * 60 * 1000,
})

/**
 * The signed-in user, for screens inside the protected stack. The root
 * layout only mounts that stack once the query has resolved to a user, but
 * on sign-out the cache flips to `null` a frame before the stack unmounts,
 * so callers render nothing for that frame rather than throwing.
 */
export function useCurrentUser(): CurrentUser | null {
  return useQuery(currentUserQueryOptions).data ?? null
}

/**
 * Whether the signed-in user's role may attempt an operation. Screens use
 * it to hide controls the API would refuse; the API checks again regardless,
 * so this is a courtesy rather than a security boundary.
 */
export function useCan(permission: Permission): boolean {
  const user = useCurrentUser()

  return user !== null && can(user.role.name, permission)
}

/** `PATCH /api/me`. The result is the full profile, ready for the cache. */
export function updateProfile(input: UpdateProfileInput): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/me', { method: 'PATCH', body: JSON.stringify(input) })
}
