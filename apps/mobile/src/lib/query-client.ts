import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '@/lib/api'
import { currentUserQueryOptions } from '@/lib/current-user'
import { dashboardKeys } from '@/lib/dashboard'
import { notificationKeys } from '@/lib/notifications'
import { clearSession } from '@/lib/session'

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
        clearSession(queryClient)
        queryClient.setQueryData(currentUserQueryOptions.queryKey, null)
      }
    },
    // The profile resolving to `null` is the other way a session ends — a
    // 401 or 403 on `/api/me` itself, which `fetchCurrentUser` maps rather
    // than throws — so the same clean-up applies.
    onSuccess: (data, query) => {
      if (query.queryKey[0] === currentUserQueryOptions.queryKey[0] && data === null) {
        clearSession(queryClient)
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
