import { describe, expect, test } from 'bun:test'
import type { z } from 'zod'
import { activityListQuerySchema } from '../src/activity'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../src/api'
import { clientListQuerySchema } from '../src/client'
import { notificationListQuerySchema } from '../src/notification'
import { projectListQuerySchema } from '../src/project'
import { taskListQuerySchema } from '../src/task'
import { userListQuerySchema } from '../src/user'

/**
 * Every list endpoint pages the same way, but each module declares its own
 * `page`, `pageSize` and `q` rather than importing one schema. This walks all
 * six through one set of expectations so they cannot drift apart — the
 * clients bake these defaults into query keys and URLs.
 */
type ListSchema = z.ZodType<{ page: number; pageSize: number; q?: string | undefined }>

const SCHEMAS: [string, ListSchema][] = [
  ['users', userListQuerySchema],
  ['clients', clientListQuerySchema],
  ['projects', projectListQuerySchema],
  ['tasks', taskListQuerySchema],
  ['activity', activityListQuerySchema],
  ['notifications', notificationListQuerySchema],
]

test('the page bounds both clients rely on', () => {
  expect(DEFAULT_PAGE_SIZE).toBe(25)
  expect(MAX_PAGE_SIZE).toBe(100)
})

describe.each(SCHEMAS)('%s list query', (_name, schema) => {
  test('an empty query is the first page at the default size', () => {
    expect(schema.parse({})).toMatchObject({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  })

  test('page and size arrive as strings and are coerced', () => {
    expect(schema.parse({ page: '3', pageSize: '50' })).toMatchObject({ page: 3, pageSize: 50 })
  })

  test.each(['0', '-1', '1.5', 'abc'])('page %j is rejected', (page) => {
    expect(schema.safeParse({ page }).success).toBe(false)
  })

  test('the page size is capped at the ceiling', () => {
    expect(schema.parse({ pageSize: String(MAX_PAGE_SIZE) }).pageSize).toBe(MAX_PAGE_SIZE)
    expect(schema.safeParse({ pageSize: String(MAX_PAGE_SIZE + 1) }).success).toBe(false)
    expect(schema.safeParse({ pageSize: '0' }).success).toBe(false)
  })

  test('q is trimmed and a cleared search means no filter', () => {
    expect(schema.parse({ q: '  term ' }).q).toBe('term')
    expect(schema.parse({ q: '' }).q).toBeUndefined()
    expect(schema.parse({ q: '   ' }).q).toBeUndefined()
    expect(schema.parse({}).q).toBeUndefined()
  })
})
