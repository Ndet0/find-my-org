import type { CurrentUser, UpdateProfileInput } from '@opsflow/types/user'
import { queryOptions } from '@tanstack/react-query'
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
