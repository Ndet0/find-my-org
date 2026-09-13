import type { CurrentUser, UpdateProfileInput } from '@opsflow/types/user'
import { type QueryClient, queryOptions } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { apiFetch } from '@/lib/api'

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
 */
export async function requireUser(queryClient: QueryClient): Promise<CurrentUser> {
  try {
    return await queryClient.ensureQueryData(currentUserQueryOptions)
  } catch {
    throw redirect({ to: '/login' })
  }
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
