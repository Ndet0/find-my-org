import { signInSchema } from '@opsflow/types/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { currentUserQueryOptions } from '@/lib/current-user'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const signedIn = await context.queryClient
      .ensureQueryData(currentUserQueryOptions)
      .then(() => true)
      .catch(() => false)

    if (signedIn) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

type FieldErrors = { email?: string[]; password?: string[] }

function LoginPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const signIn = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { error } = await authClient.signIn.email(credentials)

      if (error) {
        throw new Error(error.message ?? 'Those credentials were not accepted')
      }

      // Better Auth authenticates, but it does not know about suspended or
      // inactive accounts — only /api/me does. Until that succeeds the
      // session is unusable, so it is discarded rather than left behind to
      // bounce the user off every protected route.
      try {
        return await queryClient.fetchQuery(currentUserQueryOptions)
      } catch (cause) {
        await authClient.signOut()
        queryClient.removeQueries({ queryKey: currentUserQueryOptions.queryKey })
        throw cause
      }
    },
    onSuccess: () => router.navigate({ to: '/' }),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = signInSchema.safeParse({ email, password })

    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }

    setFieldErrors({})
    signIn.mutate(parsed.data)
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to OPSflow</CardTitle>
          <CardDescription>Use your work email to access your workspace.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {signIn.isError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {signIn.error.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@opsflow.local"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email ? (
                <p id="email-error" className="text-sm text-destructive">
                  {fieldErrors.email[0]}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password ? (
                <p id="password-error" className="text-sm text-destructive">
                  {fieldErrors.password[0]}
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={signIn.isPending}>
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
