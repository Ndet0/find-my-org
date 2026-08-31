import type { CurrentUser } from '@opsflow/types/user'
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
