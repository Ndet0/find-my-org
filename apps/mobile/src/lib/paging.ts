import type { Paginated } from '@opsflow/types/api'

/**
 * The pure half of the mobile paging story: how loaded pages become one list,
 * what the header says about them, and when the next page is asked for. The
 * TanStack wiring that fetches the pages is in `paged.ts`, which re-exports
 * everything here.
 *
 * Kept apart so it can be tested. `paged.ts` imports the API client, which
 * imports react-native, and Bun cannot load that outside Metro. Nothing in
 * this file may import a runtime value from outside `@opsflow/types`.
 */

/** Anything a list endpoint returns a page of. Dedupe needs the `id`. */
export type Identified = { id: string }

/**
 * The next page to ask for, or nothing once the last page is in. The API
 * contract is offset-paged — `{ items, page, pageSize, total, totalPages }` —
 * so this only has to compare the two numbers the envelope already carries.
 */
export function nextPageParam<T>(last: Paginated<T>): number | undefined {
  return last.page < last.totalPages ? last.page + 1 : undefined
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
