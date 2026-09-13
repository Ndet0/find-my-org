import { spyOn } from 'bun:test'

/**
 * The network, mocked at `fetch` so the real `apiFetch` envelope path runs.
 * Routes are keyed by method and pathname — `'POST /api/clients'` — because
 * the origin is whatever `VITE_API_URL` the test process was started with.
 * An unmocked request throws, so a test cannot pass by accident on a call it
 * did not expect. Responses are built with the registered `Response`, which
 * happy-dom replaces for the whole process (see setup.ts).
 */

type Reply = { status?: number; body: unknown }
type Handler = Reply | ((request: { body: unknown }) => Reply)

export type RecordedCall = { method: string; path: string; body: unknown }

function urlOf(input: string | URL | Request): URL {
  if (typeof input === 'string') return new URL(input)
  if (input instanceof URL) return input
  return new URL(input.url)
}

export function mockApi(routes: Record<string, Handler>) {
  const calls: RecordedCall[] = []

  // Bun's `typeof fetch` also carries `preconnect`, which nothing here calls.
  const implementation = async (input: string | URL | Request, init?: RequestInit) => {
    const url = urlOf(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, path: url.pathname, body })

    const handler = routes[`${method} ${url.pathname}`]
    if (!handler) {
      throw new Error(`Unmocked request: ${method} ${url.pathname}`)
    }

    const reply = typeof handler === 'function' ? handler({ body }) : handler
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const spy = spyOn(globalThis, 'fetch').mockImplementation(
    implementation as unknown as typeof fetch,
  )

  return { calls, restore: () => spy.mockRestore() }
}

/** A success envelope. */
export function ok<T>(data: T, status = 200): Reply {
  return { status, body: { success: true, data } }
}

/** An error envelope, as `apiFetch` turns into an `ApiRequestError`. */
export function fail(code: string, message: string, status: number, details?: unknown): Reply {
  return { status, body: { success: false, error: { code, message, details } } }
}
