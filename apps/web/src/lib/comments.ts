import type { Paginated } from '@opsflow/types/api'
import type {
  CommentListFilters,
  CommentListItem,
  CommentTarget,
  CreateCommentInput,
} from '@opsflow/types/comment'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/**
 * One page covers any realistic thread, so the card asks for the maximum
 * and only shows a pager when a thread outgrows it.
 */
export const COMMENT_PAGE_SIZE = 100

/**
 * Keyed by the parent, so posting on one task invalidates that thread and
 * leaves every other cached thread alone.
 */
export const commentKeys = {
  all: ['comments'] as const,
  list: (target: CommentTarget, filters: CommentListFilters) =>
    ['comments', target.kind, target.id, filters] as const,
}

function pathFor(target: CommentTarget): string {
  return `/${target.kind}s/${target.id}/comments`
}

function toSearchParams(filters: CommentListFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    // An absent filter must not be sent as the string "undefined".
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export const commentsQueryOptions = (target: CommentTarget, filters: CommentListFilters) =>
  queryOptions({
    queryKey: commentKeys.list(target, filters),
    queryFn: () =>
      apiFetch<Paginated<CommentListItem>>(`${pathFor(target)}${toSearchParams(filters)}`),
    // The thread stays on screen while the next page loads.
    placeholderData: (previous) => previous,
  })

export function createComment(target: CommentTarget, input: CreateCommentInput) {
  return apiFetch<CommentListItem>(pathFor(target), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteComment(id: string) {
  return apiFetch<CommentListItem>(`/comments/${id}`, { method: 'DELETE' })
}
