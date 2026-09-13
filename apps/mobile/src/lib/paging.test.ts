import { describe, expect, mock, test } from 'bun:test'
import type { Paginated } from '@opsflow/types/api'
import { flattenPages, loadMore, nextPageParam, pagedCountLabel, pagedTotal } from './paging'

type Row = { id: string; n?: number }

function page(items: Row[], current = 1, totalPages = 1, total = items.length): Paginated<Row> {
  return { items, page: current, pageSize: 25, total, totalPages }
}

const row = (id: string, n?: number): Row => (n === undefined ? { id } : { id, n })

describe('flattenPages', () => {
  test('nothing loaded is an empty list', () => {
    expect(flattenPages(undefined)).toEqual([])
    expect(flattenPages({ pages: [] })).toEqual([])
  })

  test('concatenates pages in order', () => {
    const data = { pages: [page([row('a'), row('b')], 1, 2), page([row('c')], 2, 2)] }
    expect(flattenPages(data).map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  test('a row that shifted across the page boundary appears once, where it was first seen', () => {
    const data = {
      pages: [page([row('a'), row('b', 1)], 1, 2), page([row('b', 2), row('c')], 2, 2)],
    }
    expect(flattenPages(data)).toEqual([row('a'), row('b', 1), row('c')])
  })

  test('a duplicate inside one page is dropped too', () => {
    expect(flattenPages({ pages: [page([row('a'), row('a')])] })).toEqual([row('a')])
  })
})

describe('pagedTotal', () => {
  test('is unknown until a page has arrived', () => {
    expect(pagedTotal(undefined)).toBeUndefined()
    expect(pagedTotal({ pages: [] })).toBeUndefined()
  })

  test('reads the newest page, whose total is the freshest', () => {
    const data = { pages: [page([row('a')], 1, 2, 10), page([row('b')], 2, 2, 12)] }
    expect(pagedTotal(data)).toBe(12)
  })
})

describe('pagedCountLabel', () => {
  test.each([
    [5, undefined, undefined],
    [1, 1, '1 task'],
    [0, 1, '0 of 1 task'],
    [25, 247, '25 of 247 tasks'],
    [247, 247, '247 tasks'],
    [0, 0, '0 tasks'],
    [30, 25, '25 tasks'],
  ])('%p loaded of %p reads %p', (loaded, total, expected) => {
    expect(pagedCountLabel(loaded, total, 'task', 'tasks')).toBe(expected)
  })
})

describe('loadMore', () => {
  function query(hasNextPage: boolean, isFetchingNextPage: boolean) {
    return { hasNextPage, isFetchingNextPage, fetchNextPage: mock(() => Promise.resolve()) }
  }

  test('asks for the next page without cancelling one already in flight', () => {
    const q = query(true, false)
    loadMore(q)()
    expect(q.fetchNextPage).toHaveBeenCalledTimes(1)
    expect(q.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false })
  })

  test('does nothing on the last page or while a page is on its way', () => {
    const last = query(false, false)
    loadMore(last)()
    expect(last.fetchNextPage).not.toHaveBeenCalled()

    const busy = query(true, true)
    loadMore(busy)()
    expect(busy.fetchNextPage).not.toHaveBeenCalled()
  })

  test('reads the query as it is when fired, not as it was when built', () => {
    const q = query(true, true)
    const onEndReached = loadMore(q)
    onEndReached()
    q.isFetchingNextPage = false
    onEndReached()
    expect(q.fetchNextPage).toHaveBeenCalledTimes(1)
  })
})

describe('nextPageParam', () => {
  test.each([
    [1, 3, 2],
    [2, 3, 3],
    [3, 3, undefined],
    [1, 1, undefined],
    [1, 0, undefined],
  ])('page %p of %p asks for %p next', (current, totalPages, expected) => {
    expect(nextPageParam(page([], current, totalPages, 0))).toBe(expected)
  })
})
