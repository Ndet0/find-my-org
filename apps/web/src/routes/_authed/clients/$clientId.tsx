import { CLIENT_STATUSES, type ClientStatus } from '@opsflow/types/client'
import { can } from '@opsflow/types/permissions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ClientStatusDialog } from '@/components/client-status-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { clientQueryOptions } from '@/lib/clients'

export const Route = createFileRoute('/_authed/clients/$clientId')({
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { clientId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const client = useQuery(clientQueryOptions(clientId))
  const canWrite = can(actor.role.name, 'clients:write')
  const [nextStatus, setNextStatus] = useState<ClientStatus | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/clients" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to clients
      </Link>

      {client.isPending ? <DetailSkeleton /> : null}

      {client.isError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unavailable</CardTitle>
            <CardDescription>{describeError(client.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {client.data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{client.data.name}</CardTitle>
                <CardDescription>{client.data.company ?? 'No company'}</CardDescription>
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
                  <StatusBadge status={client.data.status} />
                </dd>

                <dt className="text-muted-foreground">Email</dt>
                <dd>{client.data.email ?? 'Not provided'}</dd>

                <dt className="text-muted-foreground">Phone</dt>
                <dd>{client.data.phone ?? 'Not provided'}</dd>

                <dt className="text-muted-foreground">Address</dt>
                <dd className="whitespace-pre-wrap">{client.data.address ?? 'Not provided'}</dd>

                <dt className="text-muted-foreground">Projects</dt>
                <dd>{client.data.projectCount}</dd>

                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-wrap">{client.data.notes ?? 'None'}</dd>
              </dl>
            </CardContent>
          </Card>

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              {CLIENT_STATUSES.filter((status) => status !== client.data.status).map((status) => (
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
            clientId={client.data.id}
            name={client.data.name}
            projectCount={client.data.projectCount}
            currentStatus={client.data.status}
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
      return 'You do not have permission to view this client.'
    }

    if (error.code === 'CLIENT_NOT_FOUND') {
      return 'That client is no longer in the directory.'
    }
  }

  return error.message
}
