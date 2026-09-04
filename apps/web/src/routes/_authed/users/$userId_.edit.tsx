import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserForm } from '@/components/user-form'
import { userQueryOptions } from '@/lib/users'

export const Route = createFileRoute('/_authed/users/$userId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'users:write')) {
      throw redirect({ to: '/users' })
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  component: EditUserPage,
})

function EditUserPage() {
  const { userId } = Route.useParams()
  const { data: user } = useSuspenseQuery(userQueryOptions(userId))

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link
        to="/users/$userId"
        params={{ userId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to profile
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit {user.name}</CardTitle>
          <CardDescription>
            Role and department changes take effect on their next request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm user={user} />
        </CardContent>
      </Card>
    </div>
  )
}
