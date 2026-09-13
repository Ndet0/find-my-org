import './setup'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Renders a component inside the two providers every component in the app
 * assumes — a Query client and a router — without the app's own root route,
 * which imports the stylesheet, the devtools and the toaster.
 *
 * Rules for the tests that use this, because `bun test` runs every file in
 * one process with one module cache:
 *
 * - `lib/theme.ts` is imported only by `lib/theme.test.ts`. No test renders
 *   `AppShell`, `ThemeToggle`, `Toaster` or the root route; a toast is
 *   asserted by spying on sonner's `toast`.
 * - Never import `routeTree.gen.ts` or `routes/__root.tsx`.
 * - No `mock.module`: it is process-global for the rest of the run. The
 *   network is mocked at `fetch` (see `api-mock.ts`), so the real envelope
 *   path runs.
 * - Every spy is restored in `afterEach`; a fresh Query client per test.
 * - Every assertion after an event goes through `findBy*` or `waitFor`.
 * - Every file that renders registers `afterEach(cleanup)` itself. A hook
 *   registered here would attach only to the first file to import this
 *   module — Bun evaluates it once — and every later file would render on
 *   top of the last test's DOM.
 */

export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

type RenderOptions = {
  queryClient?: QueryClient
  initialPath?: string
}

/**
 * The router has the component's route at `/` and a splat route for
 * everything else, so any `router.navigate` target the component uses —
 * `/login`, `/clients/$clientId`, `/` — resolves, the pathname moves, and
 * nothing of the app renders behind it.
 */
export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const queryClient = options.queryClient ?? testQueryClient()

  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: () => <Outlet />,
  })
  const uiRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{ui}</>,
  })
  const stubRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: () => <p>stub route</p>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([uiRoute, stubRoute]),
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [options.initialPath ?? '/'] }),
    defaultPreload: false,
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...result, router, queryClient }
}
