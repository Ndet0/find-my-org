import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ProfileForm } from '@/components/profile-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { currentUserQueryOptions } from '@/lib/current-user'

export const Route = createFileRoute('/_authed/profile/edit')({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentUserQueryOptions),
  component: EditProfilePage,
})

function EditProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link to="/profile" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to profile
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your details</CardTitle>
          <CardDescription>
            Email, role, department and position are managed by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  )
}
