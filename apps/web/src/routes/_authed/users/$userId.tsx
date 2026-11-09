import { can } from '@opsflow/types/permissions'
import { USER_STATUSES, type UserStatus } from '@opsflow/types/user'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { AvatarChip } from '@/components/avatar-chip'
import { DetailLayout, Properties, Property } from '@/components/detail-layout'
import { DetailPending } from '@/components/route-feedback'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { UserStatusDialog } from '@/components/user-status-dialog'
import { userQueryOptions } from '@/lib/users'

export const Route = createFileRoute('/_authed/users/$userId')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'users:read')) {
      throw redirect({ to: '/' })
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  pendingComponent: DetailPending,
  component: UserDetailPage,
})

function UserDetailPage() {
  const { userId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const { data: user } = useSuspenseQuery(userQueryOptions(userId))
  const canWrite = can(actor.role.name, 'users:write')
  const [nextStatus, setNextStatus] = useState<UserStatus | null>(null)

  return (
    <DetailLayout
      main={
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-medium tracking-tight">
              <AvatarChip name={user.name} className="text-[20px]" />
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{user.email}</p>
          </div>
          {canWrite ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/users/$userId/edit" params={{ userId }}>
                Edit
              </Link>
            </Button>
          ) : null}
        </header>
      }
      side={
        <>
          <Properties>
            <Property label="Status">
              <StatusBadge status={user.status} />
            </Property>
            <Property label="Role">
              <span className="capitalize">{user.role.name}</span>
            </Property>
            <Property label="Department">{user.department?.name ?? 'Unassigned'}</Property>
            <Property label="Position">{user.position ?? 'Unassigned'}</Property>
            <Property label="Phone">{user.phone ?? 'Not provided'}</Property>
            <Property label="Joined">{user.joinedAt ?? 'Unknown'}</Property>
          </Properties>
          {canWrite && user.id !== actor.id ? (
            <div className="flex flex-col gap-1">
              {USER_STATUSES.filter((status) => status !== user.status).map((status) => (
                <Button
                  key={status}
                  variant={status === 'active' ? 'ghost' : 'destructive'}
                  size="sm"
                  className="justify-start capitalize"
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
        </>
      }
    />
  )
}
