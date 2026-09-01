import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { currentUserQueryOptions } from '@/lib/current-user'

/**
 * Layout route for everything that requires a session.
 *
 * The guard asks the API rather than inspecting a cookie: the session
 * cookie is httpOnly and its presence proves nothing, since only the
 * server knows whether the session is still valid and the account still
 * active. This is a convenience for the user, not a security control —
 * every route behind it is enforced again by the API.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    try {
      return { user: await context.queryClient.ensureQueryData(currentUserQueryOptions) }
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const { user } = Route.useRouteContext()

  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}
