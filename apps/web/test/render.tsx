import './setup'
import type { QueryClient as QueryClientType } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Everything below is imported after `setup.ts` has run. Bun evaluates a
// CommonJS dependency while linking the module graph, before any ES module
// body executes — so a static import here would load, for example, the
// `use-sync-external-store` shim behind TanStack Router and Form with no
// `window` in sight, and it would pick its server variant, which never
// subscribes: a typed value would never re-render. The package's bunfig
// preloads `setup.ts` ahead of linking; `bun test` from the repository root
// has no preload, and this keeps both runs the same.
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
const {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} = await import('@tanstack/react-router')
const rtl = await import('@testing-library/react')
const { render, within } = rtl

/** Testing Library's helpers, loaded once the DOM exists; import them from here. */
export const { act, cleanup, fireEvent, renderHook, waitFor } = rtl
export { render }

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
 * - Queries come from the `screen` below, not Testing Library's. Its own
 *   binds `document.body` when the package is evaluated, and Bun evaluates
 *   a CommonJS package while linking — before `setup.ts` has run, unless
 *   it was preloaded. This one binds on every access, so `bun test` from
 *   the repository root, which preloads nothing, sees the same DOM.
 */

/** Testing Library's `screen`, bound to the document at call time. */
export const screen: typeof rtl.screen = new Proxy(rtl.screen, {
  get: (_target, key) => Reflect.get(within(document.body), key),
})

export function testQueryClient(): QueryClientType {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

type RenderOptions = {
  queryClient?: QueryClientType
  initialPath?: string
}

/**
 * The router has the component's route at `/` and a splat route for
 * everything else, so any `router.navigate` target the component uses —
 * `/login`, `/clients/$clientId`, `/` — resolves, the pathname moves, and
 * nothing of the app renders behind it.
 */
export async function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const queryClient = options.queryClient ?? testQueryClient()

  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClientType }>()({
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

  // The router's first paint follows an async load; awaiting it inside `act`
  // means the caller gets a settled page and React does not report the
  // load's updates as unwrapped.
  const result = await rtl.act(async () => {
    const rendered = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await router.load()
    return rendered
  })

  return { ...result, router, queryClient }
}
