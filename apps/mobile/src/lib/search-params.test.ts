import { describe, expect, test } from 'bun:test'
import { toSearchParams } from './search-params'

describe('toSearchParams', () => {
  test('no filters is no query string', () => {
    expect(toSearchParams({})).toBe('')
  })

  test('leaves out what means "no filter": absent, cleared, or unticked', () => {
    expect(toSearchParams({ q: undefined, status: '', overdue: false, page: 2 })).toBe('?page=2')
  })

  test('sends a ticked flag as the one spelling the schemas accept', () => {
    // `taskListQuerySchema` and friends know `'true'` and nothing else.
    expect(toSearchParams({ open: true })).toBe('?open=true')
  })

  test('stringifies numbers and encodes text', () => {
    expect(toSearchParams({ page: 3, pageSize: 25, q: 'sign off' })).toBe(
      '?page=3&pageSize=25&q=sign+off',
    )
  })
})
