import { useQueryClient, useQueryErrorResetBoundary } from '@tanstack/react-query'
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { endSession } from '@/lib/current-user'

/**
 * Router-level feedback states, registered once on the router in `main.tsx`.
 *
 * Route loaders await their page's primary query, so a navigation keeps the
 * current page on screen until the next one has data. These components cover
 * what that leaves: a loader still running past the router's pending
 * threshold (a cold load or a slow network), a loader that failed, and a URL
 * that matches nothing.
 */

/**
 * Shown in the outlet once a loader has been pending long enough to notice.
 * The router default; the list and detail routes register the two shapes
 * below instead, so the skeleton has the width and rhythm of the page that
 * replaces it rather than a generic block.
 */
export function RoutePending() {
  return (
    <output className="mx-auto flex max-w-2xl flex-col gap-4" aria-busy="true">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 w-full" />
    </output>
  )
}

const LIST_ROWS = ['a', 'b', 'c', 'd', 'e', 'f'] as const

/** A list page: heading, count, a filter row and a table of six rows. */
export function ListPending() {
  return (
    <output className="mx-auto flex max-w-6xl flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
        {LIST_ROWS.map((row) => (
          <Skeleton key={row} className="h-8 w-full" />
        ))}
      </div>
    </output>
  )
}

/** A record page: the back link, then the record card and one section below it. */
export function DetailPending() {
  return (
    <output className="mx-auto flex max-w-2xl flex-col gap-4" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-32 w-full" />
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

  // A 401 means the session ended underneath the app; see `endSession`.
  useEffect(() => {
    if (!sessionEnded) {
      return
    }

    endSession(queryClient, (to) => router.navigate({ to }))
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

/** The wording for a failed request, shared with the in-page refresh notice. */
export function describe(error: Error, status: number | undefined) {
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
