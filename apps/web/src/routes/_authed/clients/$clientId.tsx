import { CLIENT_STATUSES, type ClientStatus } from '@opsflow/types/client'
import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ClientStatusDialog } from '@/components/client-status-dialog'
import { DetailPending } from '@/components/route-feedback'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { clientQueryOptions } from '@/lib/clients'

export const Route = createFileRoute('/_authed/clients/$clientId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(clientQueryOptions(params.clientId)),
  pendingComponent: DetailPending,
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { clientId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const { data: client } = useSuspenseQuery(clientQueryOptions(clientId))
  const canWrite = can(actor.role.name, 'clients:write')
  const [nextStatus, setNextStatus] = useState<ClientStatus | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/clients" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to clients
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{client.name}</CardTitle>
            <CardDescription>{client.company ?? 'No company'}</CardDescription>
          </div>
          {canWrite ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/clients/$clientId/edit" params={{ clientId }}>
                Edit
              </Link>
            </Button>
          ) : null}
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={client.status} />
            </dd>

            <dt className="text-muted-foreground">Email</dt>
            <dd>{client.email ?? 'Not provided'}</dd>

            <dt className="text-muted-foreground">Phone</dt>
            <dd>{client.phone ?? 'Not provided'}</dd>

            <dt className="text-muted-foreground">Address</dt>
            <dd className="whitespace-pre-wrap">{client.address ?? 'Not provided'}</dd>

            <dt className="text-muted-foreground">Projects</dt>
            <dd>{client.projectCount}</dd>

            <dt className="text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap">{client.notes ?? 'None'}</dd>
          </dl>
        </CardContent>
      </Card>

      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          {CLIENT_STATUSES.filter((status) => status !== client.status).map((status) => (
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
                  : 'Archive'}
            </Button>
          ))}
        </div>
      ) : null}

      <ClientStatusDialog
        clientId={client.id}
        name={client.name}
        projectCount={client.projectCount}
        currentStatus={client.status}
        nextStatus={nextStatus}
        onClose={() => setNextStatus(null)}
      />
    </div>
  )
}
