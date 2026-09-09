import { createFileRoute, Link } from '@tanstack/react-router'
import { ChangePasswordForm } from '@/components/change-password-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/profile/password')({
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link to="/profile" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to profile
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Change password</CardTitle>
          <CardDescription>
            Confirm the password you use now, then choose a new one. Every other device you are
            signed in on will be signed out; this one stays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
