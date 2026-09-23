import { describe, expect, test } from 'bun:test'
import {
  COMMENT_BODY_MAX,
  canDeleteComment,
  commentListQuerySchema,
  createCommentSchema,
} from '../src/comment'

const ME = '01a057c2-6a1f-7512-84e4-a4205576ff78'
const OTHER = '01a057c2-6a1f-7512-84e4-a4205576ff79'

describe('createCommentSchema', () => {
  test('trims the body', () => {
    expect(createCommentSchema.parse({ body: '  hello  ' })).toEqual({ body: 'hello' })
  })

  test.each(['', '   '])('rejects a blank body (%j)', (body) => {
    const result = createCommentSchema.safeParse({ body })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['body'])
  })

  test('accepts exactly the maximum length and rejects one more', () => {
    expect(createCommentSchema.safeParse({ body: 'x'.repeat(COMMENT_BODY_MAX) }).success).toBe(true)
    expect(createCommentSchema.safeParse({ body: 'x'.repeat(COMMENT_BODY_MAX + 1) }).success).toBe(
      false,
    )
  })
})

describe('commentListQuerySchema', () => {
  test('defaults the page and size', () => {
    expect(commentListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 25 })
  })

  test('caps the page size', () => {
    expect(commentListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false)
    expect(commentListQuerySchema.parse({ pageSize: '100' }).pageSize).toBe(100)
  })
})

describe('canDeleteComment', () => {
  test('an employee may delete only their own comment', () => {
    const employee = { id: ME, role: 'employee' as const }
    expect(canDeleteComment(employee, { authorId: ME })).toBe(true)
    expect(canDeleteComment(employee, { authorId: OTHER })).toBe(false)
    expect(canDeleteComment(employee, { authorId: null })).toBe(false)
  })

  test.each(['manager', 'admin'] as const)('a %s may delete any comment', (role) => {
    const actor = { id: ME, role }
    expect(canDeleteComment(actor, { authorId: OTHER })).toBe(true)
    expect(canDeleteComment(actor, { authorId: null })).toBe(true)
  })
})
