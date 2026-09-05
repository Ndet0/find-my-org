import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '@/lib/api'
import { currentUserQueryOptions } from '@/lib/current-user'

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
        queryClient.setQueryData(currentUserQueryOptions.queryKey, null)
      }
    },
  }),
})
