const apiUrl = import.meta.env.VITE_API_URL

/**
 * Vite inlines `import.meta.env` at build time, so a missing variable
 * arrives as `undefined` regardless of the type in vite-env.d.ts.
 *
 * This is checked at module load rather than at the call site because the
 * fallback is dangerous: Better Auth resolves a missing base URL to the
 * page origin, which would send credentials to the Vite dev server and
 * fail in a way that looks like a session bug.
 */
if (!apiUrl) {
  throw new Error('VITE_API_URL is not set — copy .env.example to .env in the repository root')
}

export const API_URL = apiUrl
