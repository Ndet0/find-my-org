import { can } from '@opsflow/types/permissions'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ClientForm } from '@/components/client-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/clients/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'clients:write')) {
      throw redirect({ to: '/clients' })
    }
  },
  component: NewClientPage,
})

function NewClientPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link to="/clients" className="text-sm text-muted-foreground hover:text-foreground">
        Back to clients
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a client</CardTitle>
          <CardDescription>
            A new client starts as active. Status changes happen from their page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  )
}
