import { useQueryClient, useQueryErrorResetBoundary } from '@tanstack/react-query'
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { currentUserQueryOptions } from '@/lib/current-user'

/**
 * Router-level feedback states, registered once on the router in `main.tsx`.
 *
 * Route loaders await their page's primary query, so a navigation keeps the
 * current page on screen until the next one has data. These components cover
 * what that leaves: a loader still running past the router's pending
 * threshold (a cold load or a slow network), a loader that failed, and a URL
 * that matches nothing.
 */

/** Shown in the outlet once a loader has been pending long enough to notice. */
export function RoutePending() {
  return (
    <output className="mx-auto flex max-w-2xl flex-col gap-4" aria-busy="true">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 w-full" />
    </output>
  )
}

/**
 * Renders in place of the route whose loader threw, so the application shell
 * stays around it. The API's error envelope is what decides the wording.
 */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const queryErrors = useQueryErrorResetBoundary()
  const status = error instanceof ApiRequestError ? error.status : undefined
  const sessionEnded = status === 401

  // Query keeps a failed query in its error state; clear it so that when
  // the loader re-runs after `router.invalidate()` it fetches again instead
  // of rethrowing the same error.
  useEffect(() => {
    queryErrors.reset()
  }, [queryErrors])

  // A 401 means the session ended underneath the app. The cached profile is
  // what the `/_authed` guard trusts, so drop it before handing over to the
  // login page, otherwise the guard would let the user straight back in.
  useEffect(() => {
    if (!sessionEnded) {
      return
    }

    queryClient.removeQueries({ queryKey: currentUserQueryOptions.queryKey })
    void router.navigate({ to: '/login' })
  }, [sessionEnded, queryClient, router])

  if (sessionEnded) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Signed out</CardTitle>
          <CardDescription>Your session has ended. Taking you to the sign-in page.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { title, description, retryable } = describe(error, status)

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        {retryable ? (
          <Button variant="outline" size="sm" onClick={() => router.invalidate()}>
            Try again
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link to="/">Go to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function describe(error: Error, status: number | undefined) {
  if (status === 404) {
    // Row scoping answers 404 for records outside the caller's view, so this
    // is deliberately not "deleted".
    return {
      title: 'Not found',
      description: 'This record does not exist or is not part of your work.',
      retryable: false,
    }
  }

  if (status === 403) {
    // Navigation hides pages a role cannot reach, but the address bar does
    // not, so the server's refusal is explained rather than shown as a crash.
    return {
      title: 'No access',
      description: 'Your role does not have permission to view this page.',
      retryable: false,
    }
  }

  return {
    title: 'Something went wrong',
    description: error.message || 'The page could not be loaded.',
    retryable: true,
  }
}

/** Unmatched URLs render outside any layout, so this carries its own frame. */
export function RouteNotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Page not found</CardTitle>
          <CardDescription>There is nothing at this address.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
