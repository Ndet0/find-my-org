import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'
import type { RoleName } from './permissions'
import type { NamedRef } from './user'

/** What a thread hangs off. Each comment belongs to exactly one parent. */
export const COMMENT_TARGET_KINDS = ['task', 'project'] as const

export type CommentTargetKind = (typeof COMMENT_TARGET_KINDS)[number]

export type CommentTarget = { kind: CommentTargetKind; id: string }

export const COMMENT_BODY_MAX = 5000

/**
 * One row of `GET /api/{tasks,projects}/:id/comments`, and the body of the
 * POST and DELETE replies. The author is null once their account is gone.
 */
export type CommentListItem = {
  id: string
  body: string
  createdAt: string
  author: NamedRef | null
  target: CommentTarget
}

export const commentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type CommentListQuery = z.infer<typeof commentListQuerySchema>

export type CommentListFilters = { page?: number; pageSize?: number }

/** The body of `POST /api/{tasks,projects}/:id/comments`. */
export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Enter a comment')
    .max(COMMENT_BODY_MAX, `A comment must be ${COMMENT_BODY_MAX} characters or fewer`),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>

/**
 * Who may delete a comment: its author, or anyone who is not an employee.
 * Shared so the API enforces the same rule the clients use to hide the
 * control. Seeing the comment at all is decided separately, by the parent.
 */
export function canDeleteComment(
  actor: { id: string; role: RoleName },
  comment: { authorId: string | null },
): boolean {
  return actor.role !== 'employee' || comment.authorId === actor.id
}
