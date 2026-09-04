import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouteError, RouteNotFound, RoutePending } from '@/components/route-feedback'
import { activityKeys } from '@/lib/activity'
import { dashboardKeys } from '@/lib/dashboard'
import { notificationKeys } from '@/lib/notifications'
import { routeTree } from './routeTree.gen'

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
  mutationCache: new MutationCache({
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
