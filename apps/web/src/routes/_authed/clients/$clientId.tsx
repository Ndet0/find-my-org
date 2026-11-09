import { CLIENT_STATUSES, type ClientStatus } from '@opsflow/types/client'
import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ClientStatusDialog } from '@/components/client-status-dialog'
import { DetailLayout, Properties, Property } from '@/components/detail-layout'
import { DetailPending } from '@/components/route-feedback'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
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
    <DetailLayout
      main={
        <>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-medium tracking-tight">{client.name}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {client.company ?? 'No company'}
              </p>
            </div>
            {canWrite ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/clients/$clientId/edit" params={{ clientId }}>
                  Edit
                </Link>
              </Button>
            ) : null}
          </header>
          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium">Notes</h2>
            <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">
              {client.notes ?? 'None'}
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium">Address</h2>
            <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">
              {client.address ?? 'Not provided'}
            </p>
          </section>
        </>
      }
      side={
        <>
          <Properties>
            <Property label="Status">
              <StatusBadge status={client.status} />
            </Property>
            <Property label="Email">{client.email ?? 'Not provided'}</Property>
            <Property label="Phone">{client.phone ?? 'Not provided'}</Property>
            <Property label="Projects">{client.projectCount}</Property>
          </Properties>
          {canWrite ? (
            <div className="flex flex-col gap-1">
              {CLIENT_STATUSES.filter((status) => status !== client.status).map((status) => (
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
        </>
      }
    />
  )
}
