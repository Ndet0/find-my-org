import { DEFAULT_PAGE_SIZE, type Paginated } from '@opsflow/types/api'
import { infiniteQueryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toSearchParams } from '@/lib/search-params'

/**
 * The mobile half of the paging story. The web's lists show a total and let
 * the user jump to a page; a phone has no room for that control, so the lists
 * here ask for one page at the server's default size and append the next as
 * the reader reaches the end.
 *
 * The API contract is unchanged — still offset-paged, still
 * `{ items, page, pageSize, total, totalPages }` — so `getNextPageParam` only
 * has to compare the two numbers the envelope already carries. No cursor.
 */

/** Anything a list endpoint returns a page of. Dedupe needs the `id`. */
type Identified = { id: string }

/**
 * `page` comes from `pageParam` alone. Taking it out of the filters type stops
 * a caller from passing one, which would put a page number in the query key
 * while `pageParam` decided the URL — the cache entry and the rows in it would
 * then describe different requests.
 */
export function infiniteListOptions<T extends Identified>(
  queryKey: readonly unknown[],
  path: string,
  filters: Record<string, unknown>,
) {
  return infiniteQueryOptions({
    queryKey,
    queryFn: ({ pageParam }) =>
      apiFetch<Paginated<T>>(
        `${path}${toSearchParams({ ...filters, page: pageParam, pageSize: DEFAULT_PAGE_SIZE })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<T>) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  })
}

/**
 * The loaded pages as one list, deduplicated by id.
 *
 * The dedupe is not defensive tidying. Offset paging reads the table twice at
 * two offsets, so a row inserted *above* the window between the two reads
 * shifts everything down and the last row of page one comes back as the first
 * row of page two. That is the ordinary case for the activity trail and the
 * inbox, which are newest-first and insert at the top, and a repeated row is a
 * repeated `keyExtractor` key. A total order on the server (the `id`
 * tiebreaker on every list query) stops ties from reordering; this stops the
 * shift. Both are needed.
 *
 * First occurrence wins, so a row keeps the position the reader already saw it
 * in rather than jumping down the list.
 */
export function flattenPages<T extends Identified>(
  data: { pages: Paginated<T>[] } | undefined,
): T[] {
  if (!data) {
    return []
  }

  const seen = new Set<string>()
  const items: T[] = []

  for (const page of data.pages) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        items.push(item)
      }
    }
  }

  return items
}

/**
 * The server's count of everything that matches, from the most recently
 * fetched page. Every page carries the same figure, but the newest one is the
 * freshest reading of a number that moves while the reader scrolls.
 */
export function pagedTotal<T extends Identified>(
  data: { pages: Paginated<T>[] } | undefined,
): number | undefined {
  if (!data || data.pages.length === 0) {
    return undefined
  }

  return data.pages[data.pages.length - 1]?.total
}

/**
 * The subtitle every list header shows: how many rows are on screen out of how
 * many there are, until there is no difference left to report.
 *
 * This is the defect that started the work. The header read the server's
 * total — "247 tasks" — above however many rows one page held, and nothing
 * said the rest existed.
 */
export function pagedCountLabel(
  loaded: number,
  total: number | undefined,
  singular: string,
  plural: string,
): string | undefined {
  if (total === undefined) {
    return undefined
  }

  const noun = total === 1 ? singular : plural

  return loaded < total ? `${loaded} of ${total} ${noun}` : `${total} ${noun}`
}

/**
 * The `onEndReached` handler for an infinite list, written once because both
 * halves of it are easy to get wrong.
 *
 * `FlatList` can fire `onEndReached` more than once for the same end — on
 * layout, on a fast fling, when a short page does not fill the screen — so
 * the call is dropped while a page is already on its way. `cancelRefetch:
 * false` covers the fire that slips past that render-time check: the default
 * is `true`, which would cancel the in-flight request and issue the same page
 * again.
 */
export function loadMore(query: {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: (options?: { cancelRefetch?: boolean }) => Promise<unknown>
}): () => void {
  return () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage({ cancelRefetch: false })
    }
  }
}
