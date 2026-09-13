import { DEFAULT_PAGE_SIZE, type Paginated } from '@opsflow/types/api'
import { infiniteQueryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { type Identified, nextPageParam } from '@/lib/paging'
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
 *
 * The helpers that turn loaded pages into a list live in `paging.ts`, where
 * they can be tested without react-native; they are re-exported here so the
 * screens have one module to import from.
 */

export { flattenPages, loadMore, pagedCountLabel, pagedTotal } from '@/lib/paging'

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
    getNextPageParam: (last: Paginated<T>) => nextPageParam(last),
  })
}
