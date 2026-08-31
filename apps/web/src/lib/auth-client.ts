import { createAuthClient } from 'better-auth/react'
import { API_URL } from '@/lib/env'

/**
 * Better Auth owns sign-in and sign-out. Its endpoints return their own
 * response shape rather than the OPSflow envelope, which is why they go
 * through this client instead of `apiFetch`.
 *
 * `baseURL` is the API origin; the client appends Better Auth's default
 * `/api/auth` base path, which is the path the API mounts it on.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
})
