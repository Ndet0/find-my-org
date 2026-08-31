import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_authed/')({
  component: HomePage,
})

/**
 * Placeholder for the role-based dashboard. It exists to prove the
 * authentication slice end to end: the profile below is the API's answer
 * to a cookie the browser sent across origins.
 */
function HomePage() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const queryClient = useQueryClient()

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      // Nothing cached under the old session may survive into the next one.
      queryClient.clear()
      await router.navigate({ to: '/login' })
    },
  })

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <span className="font-semibold tracking-tight">OPSflow</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          {signOut.isPending ? 'Signing out…' : 'Sign out'}
        </Button>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome back, {user.name}</CardTitle>
            <CardDescription>Signed in as {user.email}</CardDescription>
          </CardHeader>

          <CardContent>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="capitalize">{user.role.name}</dd>

              <dt className="text-muted-foreground">Department</dt>
              <dd>{user.department?.name ?? 'Unassigned'}</dd>

              <dt className="text-muted-foreground">Position</dt>
              <dd>{user.position ?? 'Unassigned'}</dd>

              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{user.status}</dd>
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
