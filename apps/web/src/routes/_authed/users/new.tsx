import { can } from '@opsflow/types/permissions'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserForm } from '@/components/user-form'

export const Route = createFileRoute('/_authed/users/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'users:write')) {
      throw redirect({ to: '/users' })
    }
  },
  component: NewUserPage,
})

function NewUserPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground">
        Back to team
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a person</CardTitle>
          <CardDescription>
            They will sign in with the email and initial password you set here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
    </div>
  )
}
