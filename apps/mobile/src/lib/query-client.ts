import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '@/lib/api'
import { currentUserQueryOptions } from '@/lib/current-user'
import { dashboardKeys } from '@/lib/dashboard'
import { forgetMessagingSecret } from '@/lib/dm-identity'
import { notificationKeys } from '@/lib/notifications'
import { clearSession } from '@/lib/session'

/**
 * A session that ended underneath the app takes the messaging secret with
 * it, as sign-out does: the next person to sign in on this phone must not
 * find the previous person's key. The owner is read from the cache before
 * it is cleared, since SecureStore cannot be enumerated.
 */
function endSession(): void {
  const user = queryClient.getQueryData(currentUserQueryOptions.queryKey)
  void forgetMessagingSecret(user?.id)
  clearSession(queryClient)
}

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Same cadence as the web client: writes invalidate their module, so
      // staleness only governs how often an untouched screen refetches.
      staleTime: 30_000,
      // A 4xx will not change on retry; only a server or network failure
      // deserves a second attempt.
      retry: (failureCount, error) =>
        !(error instanceof ApiRequestError && error.status < 500) && failureCount < 2,
    },
  },
  queryCache: new QueryCache({
    // A 401 from any query means the session ended underneath the app.
    // Marking the current user as signed out flips the root layout to the
    // login stack. The current-user query itself already maps 401 to null,
    // so it is excluded to keep this from feeding back into itself.
    onError: (error, query) => {
      if (
        error instanceof ApiRequestError &&
        error.status === 401 &&
        query.queryKey[0] !== currentUserQueryOptions.queryKey[0]
      ) {
        endSession()
        queryClient.setQueryData(currentUserQueryOptions.queryKey, null)
      }
    },
    // The profile resolving to `null` is the other way a session ends — a
    // 401 or 403 on `/api/me` itself, which `fetchCurrentUser` maps rather
    // than throws — so the same clean-up applies. The cache still holds the
    // previous answer at this point, which is where the owner's id comes from.
    onSuccess: (data, query) => {
      if (query.queryKey[0] === currentUserQueryOptions.queryKey[0] && data === null) {
        endSession()
      }
    },
  }),
  mutationCache: new MutationCache({
    // As on the web: the API moves the dashboard counts and may raise a
    // notification on every write, so those are derived views refreshed
    // after any mutation rather than something each mutation remembers.
    // Invalidating a key that is not in the cache is a no-op, so this is
    // harmless around sign-in and sign-out.
    //
    // The inbox is the exception. It is an infinite list, and refetching one
    // re-requests every page it has loaded, one after another — against an
    // inbox scrolled to page six, six requests for every write anywhere in the
    // app. So it is only marked stale here, and the inbox screen refetches it
    // when it next comes into focus. The unread count and the dashboard feed
    // are single cheap requests and still refresh straight away.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats })
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
        predicate: (query) => query.queryKey[1] !== notificationKeys.inbox[1],
      })
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.inbox,
        refetchType: 'none',
      })
    },
  }),
})
