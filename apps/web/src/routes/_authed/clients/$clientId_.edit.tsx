import { can } from '@opsflow/types/permissions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ClientForm } from '@/components/client-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { clientQueryOptions } from '@/lib/clients'

export const Route = createFileRoute('/_authed/clients/$clientId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'clients:write')) {
      throw redirect({ to: '/clients' })
    }
  },
  component: EditClientPage,
})

function EditClientPage() {
  const { clientId } = Route.useParams()
  const client = useQuery(clientQueryOptions(clientId))

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link
        to="/clients/$clientId"
        params={{ clientId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to client
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit {client.data?.name ?? 'client'}</CardTitle>
          <CardDescription>Status is changed from the client page, not this form.</CardDescription>
        </CardHeader>
        <CardContent>
          {client.isPending ? <Skeleton className="h-64 w-full" /> : null}
          {client.isError ? (
            <p className="text-sm text-destructive">
              {client.error instanceof ApiRequestError
                ? client.error.message
                : 'This client could not be loaded.'}
            </p>
          ) : null}
          {client.data ? <ClientForm client={client.data} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
