import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/current-user'

/** Layout route for everything that requires a session; see `requireUser`. */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => ({
    user: await requireUser(context.queryClient, location.href),
  }),
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
