/**
 * Serialises list filters into a query string. Shared by every list module
 * so they agree on what "no filter" means: an absent value, an empty string
 * (a cleared control) or `false` (an unticked flag) is left out rather than
 * being sent as the literal text "undefined" or "false".
 */
export function toSearchParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value))
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}
