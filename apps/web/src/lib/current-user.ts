import type { CurrentUser, UpdateProfileInput } from '@opsflow/types/user'
import { type QueryClient, queryOptions } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { ApiRequestError, apiFetch } from '@/lib/api'
import { forgetMessagingSecrets } from '@/lib/dm-identity'

/**
 * `/api/me` is the client's single source of truth for authentication.
 *
 * It answers both "is there a session" and "is that account still active"
 * in one round trip, and it is the server's answer rather than the
 * client's guess — the session cookie is httpOnly and its validity can be
 * revoked at any time.
 */
export const currentUserQueryOptions = queryOptions({
  queryKey: ['current-user'],
  queryFn: () => apiFetch<CurrentUser>('/me'),
  // A missing or rejected session is a routing decision, not a transient
  // failure; retrying it just delays the redirect to the login page.
  retry: false,
  staleTime: 5 * 60 * 1000,
})

/**
 * The `/_authed` guard: the profile, or a redirect to the login page.
 *
 * It asks the API rather than inspecting a cookie: the session cookie is
 * httpOnly and its presence proves nothing, since only the server knows
 * whether the session is still valid and the account still active. A
 * convenience for the user, not a security control — every route behind it
 * is enforced again by the API.
 *
 * Only a refused session redirects. A network failure or a 500 is rethrown
 * so the route's error component shows something retryable, rather than a
 * silent bounce to the login page while the session is in fact fine.
 * `href` is the page being asked for, carried so the login page can return
 * to it; see `safeRedirect`.
 */
export async function requireUser(queryClient: QueryClient, href?: string): Promise<CurrentUser> {
  try {
    return await queryClient.ensureQueryData(currentUserQueryOptions)
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      throw redirect({
        to: '/login',
        search: href && safeRedirect(href) !== '/' ? { redirect: href } : {},
      })
    }

    throw error
  }
}

/**
 * Where the login page sends a person once they are in. The `?redirect=`
 * parameter is whatever the URL says, so it is trusted only as a path within
 * this app: it must start with one slash, not two (`//evil.example` is a
 * protocol-relative URL) and not a backslash (which browsers read as one).
 * Anything else lands on the dashboard.
 */
export function safeRedirect(target: string | undefined): string {
  if (!target?.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return '/'
  }

  return target
}

/**
 * What every 401 outside the guard means: the session ended underneath the
 * app. The cached profile is what the `/_authed` guard trusts, so it is
 * dropped before handing over to the login page; otherwise the guard would
 * let the person straight back in on stale data. The messaging secret goes
 * with it, as on sign-out: whoever signs in next on this browser must not
 * find the previous person's key.
 */
export function endSession(queryClient: QueryClient, navigate: (to: '/login') => unknown): void {
  forgetMessagingSecrets()
  queryClient.removeQueries({ queryKey: currentUserQueryOptions.queryKey })
  void navigate('/login')
}

/** The login page's probe: is there already a usable session? */
export function isSignedIn(queryClient: QueryClient): Promise<boolean> {
  return queryClient
    .ensureQueryData(currentUserQueryOptions)
    .then(() => true)
    .catch(() => false)
}

/**
 * `PATCH /api/me`. The result is the full profile, so the caller can write it
 * straight into the cache rather than refetching what the API just returned.
 *
 * Only name and phone are accepted. Email, role, department, position and
 * status belong to an administrator, and a password change is an account
 * operation that goes to Better Auth rather than here.
 */
export function updateProfile(input: UpdateProfileInput): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/me', { method: 'PATCH', body: JSON.stringify(input) })
}
