import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/')({
  component: HomePage,
})

/**
 * Placeholder for the role-based dashboard. It exists to prove the
 * authentication slice end to end: the profile below is the API's answer
 * to a cookie the browser sent across origins.
 */
function HomePage() {
  const { user } = Route.useRouteContext()

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Welcome back, {user.name}</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="capitalize">{user.role.name}</dd>

            <dt className="text-muted-foreground">Department</dt>
            <dd>{user.department?.name ?? 'Unassigned'}</dd>

            <dt className="text-muted-foreground">Position</dt>
            <dd>{user.position ?? 'Unassigned'}</dd>

            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{user.status}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
