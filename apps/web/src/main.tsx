import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouteError, RouteNotFound, RoutePending } from '@/components/route-feedback'
import { activityKeys } from '@/lib/activity'
import { ApiRequestError } from '@/lib/api'
import { currentUserQueryOptions, endSession } from '@/lib/current-user'
import { dashboardKeys } from '@/lib/dashboard'
import { notificationKeys } from '@/lib/notifications'
import { routeTree } from './routeTree.gen'

/**
 * A 401 from anywhere means the session ended underneath the app: the
 * dashboard's polling, the unread badge, a save. Route loaders already land
 * on `RouteError`, which handles it; this catches the rest, which would
 * otherwise fail quietly and leave a signed-out page on screen. The
 * current-user query is excluded: the guard turns its 401 into a redirect
 * itself, and the login page's probe expects it to fail.
 */
function onSessionEnded(error: unknown, queryKey?: readonly unknown[]) {
  if (
    error instanceof ApiRequestError &&
    error.status === 401 &&
    queryKey?.[0] !== currentUserQueryOptions.queryKey[0]
  ) {
    endSession(queryClient, (to) => router.navigate({ to }))
  }
}

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Route loaders warm the cache on link hover and read it again on
      // navigation, so a query fetched on hover must still count as fresh
      // when the page mounts a moment later, or every navigation costs two
      // requests. Thirty seconds is the drift the app already accepts for
      // the dashboard and the unread badge. Writes never wait on it: every
      // mutation invalidates its own module, and the cache below handles
      // the modules that every write feeds.
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => onSessionEnded(error, query.queryKey),
  }),
  mutationCache: new MutationCache({
    onError: (error) => onSessionEnded(error),
    // The API logs activity for every write, may notify someone, and the
    // dashboard counts change with all of them. They are derived views of
    // every module, so they are invalidated here rather than by each
    // mutation remembering to.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats })
    },
  }),
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Query owns freshness. With the router's own preload cache disabled it
  // runs the loader on every hover, and `ensureQueryData` decides whether
  // that is a cache hit or a request.
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
