import type { QueryClient } from '@tanstack/react-query'

/** The one query key that survives `clearSession`; matches `currentUserQueryOptions`. */
export const CURRENT_USER_KEY = 'current-user'

/**
 * Drops everything cached under a session that has ended, so nothing of it
 * survives into the next one. Sign-out, a 401 from any query, and a 403 on
 * the profile all end a session; without this a second person signing in on
 * the same phone saw the first person's tasks, projects and inbox while the
 * refetches ran.
 *
 * The current-user entry is left alone: callers set it to `null` or to the
 * new user themselves, which is what flips the root layout, and removing it
 * would make the layout refetch first.
 *
 * In `lib/` and free of react-native so it can be tested under Bun.
 */
export function clearSession(queryClient: QueryClient): void {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== CURRENT_USER_KEY,
  })
}
