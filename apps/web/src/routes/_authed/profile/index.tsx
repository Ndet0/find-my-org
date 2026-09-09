import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { currentUserQueryOptions } from '@/lib/current-user'

/**
 * Your own profile. There is no permission check: every active user may read
 * and edit themselves, whatever their role, which is why `/api/me` sits behind
 * `requireAuth` alone.
 */
export const Route = createFileRoute('/_authed/profile/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentUserQueryOptions),
  component: ProfilePage,
})

function ProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile/edit">Edit</Link>
          </Button>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="capitalize">{user.role.name}</dd>

            <dt className="text-muted-foreground">Department</dt>
            <dd>{user.department?.name ?? 'Unassigned'}</dd>

            <dt className="text-muted-foreground">Position</dt>
            <dd>{user.position ?? 'Unassigned'}</dd>

            <dt className="text-muted-foreground">Phone</dt>
            <dd>{user.phone ?? 'Not provided'}</dd>

            <dt className="text-muted-foreground">Joined</dt>
            <dd>{user.joinedAt ?? 'Unknown'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Password</CardTitle>
            <CardDescription>
              Changing it signs you out everywhere else, but not on this device.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile/password">Change</Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}
