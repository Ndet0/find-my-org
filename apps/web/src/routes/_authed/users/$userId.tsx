import { can } from '@opsflow/types/permissions'
import { USER_STATUSES, type UserStatus } from '@opsflow/types/user'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserStatusDialog } from '@/components/user-status-dialog'
import { ApiRequestError } from '@/lib/api'
import { userQueryOptions } from '@/lib/users'

export const Route = createFileRoute('/_authed/users/$userId')({
  component: UserDetailPage,
})

function UserDetailPage() {
  const { userId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const user = useQuery(userQueryOptions(userId))
  const canWrite = can(actor.role.name, 'users:write')
  const [nextStatus, setNextStatus] = useState<UserStatus | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/users" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to team
      </Link>

      {user.isPending ? <DetailSkeleton /> : null}

      {user.isError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unavailable</CardTitle>
            <CardDescription>{describeError(user.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {user.data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{user.data.name}</CardTitle>
                <CardDescription>{user.data.email}</CardDescription>
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
                  <StatusBadge status={user.data.status} />
                </dd>

                <dt className="text-muted-foreground">Role</dt>
                <dd className="capitalize">{user.data.role.name}</dd>

                <dt className="text-muted-foreground">Department</dt>
                <dd>{user.data.department?.name ?? 'Unassigned'}</dd>

                <dt className="text-muted-foreground">Position</dt>
                <dd>{user.data.position ?? 'Unassigned'}</dd>

                <dt className="text-muted-foreground">Phone</dt>
                <dd>{user.data.phone ?? 'Not provided'}</dd>

                <dt className="text-muted-foreground">Joined</dt>
                <dd>{user.data.joinedAt ?? 'Unknown'}</dd>
              </dl>
            </CardContent>
          </Card>

          {canWrite && user.data.id !== actor.id ? (
            <div className="flex flex-wrap gap-2">
              {USER_STATUSES.filter((status) => status !== user.data.status).map((status) => (
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
            userId={user.data.id}
            name={user.data.name}
            currentStatus={user.data.status}
            nextStatus={nextStatus}
            onClose={() => setNextStatus(null)}
          />
        </>
      ) : null}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function describeError(error: Error): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'FORBIDDEN') {
      return 'You do not have permission to view this profile.'
    }

    if (error.code === 'USER_NOT_FOUND') {
      return 'That person is no longer in the directory.'
    }
  }

  return error.message
}
