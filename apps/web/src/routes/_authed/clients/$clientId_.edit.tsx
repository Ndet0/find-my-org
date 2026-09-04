import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ClientForm } from '@/components/client-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { clientQueryOptions } from '@/lib/clients'

export const Route = createFileRoute('/_authed/clients/$clientId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'clients:write')) {
      throw redirect({ to: '/clients' })
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(clientQueryOptions(params.clientId)),
  component: EditClientPage,
})

function EditClientPage() {
  const { clientId } = Route.useParams()
  const { data: client } = useSuspenseQuery(clientQueryOptions(clientId))

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
          <CardTitle className="text-xl">Edit {client.name}</CardTitle>
          <CardDescription>Status is changed from the client page, not this form.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm client={client} />
        </CardContent>
      </Card>
    </div>
  )
}
