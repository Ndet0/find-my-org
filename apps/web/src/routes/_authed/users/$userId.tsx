import { can } from '@opsflow/types/permissions'
import { USER_STATUSES, type UserStatus } from '@opsflow/types/user'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserStatusDialog } from '@/components/user-status-dialog'
import { userQueryOptions } from '@/lib/users'

export const Route = createFileRoute('/_authed/users/$userId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  component: UserDetailPage,
})

function UserDetailPage() {
  const { userId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const { data: user } = useSuspenseQuery(userQueryOptions(userId))
  const canWrite = can(actor.role.name, 'users:write')
  const [nextStatus, setNextStatus] = useState<UserStatus | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/users" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to team
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          {canWrite ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/users/$userId/edit" params={{ userId }}>
                Edit
              </Link>
            </Button>
          ) : null}
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={user.status} />
            </dd>

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

      {canWrite && user.id !== actor.id ? (
        <div className="flex flex-wrap gap-2">
          {USER_STATUSES.filter((status) => status !== user.status).map((status) => (
            <Button
              key={status}
              variant={status === 'active' ? 'outline' : 'destructive'}
              size="sm"
              className="capitalize"
              onClick={() => setNextStatus(status)}
            >
              {status === 'active'
                ? 'Reactivate'
                : status === 'inactive'
                  ? 'Deactivate'
                  : 'Suspend'}
            </Button>
          ))}
        </div>
      ) : null}

      <UserStatusDialog
        userId={user.id}
        name={user.name}
        currentStatus={user.status}
        nextStatus={nextStatus}
        onClose={() => setNextStatus(null)}
      />
    </div>
  )
}
