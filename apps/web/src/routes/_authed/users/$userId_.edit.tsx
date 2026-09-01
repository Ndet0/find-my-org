import { can } from '@opsflow/types/permissions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserForm } from '@/components/user-form'
import { ApiRequestError } from '@/lib/api'
import { userQueryOptions } from '@/lib/users'

export const Route = createFileRoute('/_authed/users/$userId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'users:write')) {
      throw redirect({ to: '/users' })
    }
  },
  component: EditUserPage,
})

function EditUserPage() {
  const { userId } = Route.useParams()
  const user = useQuery(userQueryOptions(userId))

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
          <CardTitle className="text-xl">Edit {user.data?.name ?? 'person'}</CardTitle>
          <CardDescription>
            Role and department changes take effect on their next request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.isPending ? <Skeleton className="h-64 w-full" /> : null}
          {user.isError ? (
            <p className="text-sm text-destructive">
              {user.error instanceof ApiRequestError
                ? user.error.message
                : 'This profile could not be loaded.'}
            </p>
          ) : null}
          {user.data ? <UserForm user={user.data} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
