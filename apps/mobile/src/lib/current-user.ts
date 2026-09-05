import type { CurrentUser } from '@opsflow/types/user'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiRequestError, apiFetch } from '@/lib/api'

/**
 * `/api/me` is the client's single source of truth for authentication, as
 * on the web: it answers "is there a session" and "is the account still
 * active" in one round trip, and it is the server's answer rather than a
 * guess from whatever is in SecureStore.
 *
 * Unlike the web client, a missing session resolves to `null` instead of
 * throwing. The root layout switches between the login and app stacks on
 * this value, and "signed out" is a normal state there, not an error.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiFetch<CurrentUser>('/me')
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null
    }

    throw error
  }
}

export const currentUserQueryOptions = queryOptions({
  queryKey: ['current-user'],
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
