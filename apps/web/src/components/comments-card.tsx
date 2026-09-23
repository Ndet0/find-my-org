import {
  COMMENT_BODY_MAX,
  type CommentListItem,
  type CommentTarget,
  canDeleteComment,
} from '@opsflow/types/comment'
import type { RoleName } from '@opsflow/types/permissions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ApiRequestError } from '@/lib/api'
import {
  COMMENT_PAGE_SIZE,
  commentKeys,
  commentsQueryOptions,
  createComment,
  deleteComment,
} from '@/lib/comments'

export type CommentActor = { id: string; role: RoleName }

/**
 * The discussion under a task or a project. Oldest first, with the composer
 * at the bottom next to the newest comment. Whether the actor may see the
 * thread at all is the parent's decision, made before this renders; the only
 * rule applied here is who gets a Delete button, shared with the API.
 */
export function CommentsCard({ target, actor }: { target: CommentTarget; actor: CommentActor }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [body, setBody] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CommentListItem | null>(null)

  const comments = useQuery(commentsQueryOptions(target, { page, pageSize: COMMENT_PAGE_SIZE }))
  const total = comments.data?.total ?? 0
  const totalPages = comments.data?.totalPages ?? 1

  const post = useMutation({
    mutationFn: () => createComment(target, { body }),
    onSuccess: async () => {
      setBody('')
      // The new comment sits at the end of the thread; go to its page.
      setPage(Math.max(1, Math.ceil((total + 1) / COMMENT_PAGE_SIZE)))
      await queryClient.invalidateQueries({ queryKey: commentKeys.all })
      toast.success('Comment posted')
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The comment could not be posted',
      )
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: async () => {
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey: commentKeys.all })
      toast.success('Comment deleted')
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The comment could not be deleted',
      )
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comments</CardTitle>
        <CardDescription>
          {comments.data
            ? `${total} ${total === 1 ? 'comment' : 'comments'}`
            : `Discussion on this ${target.kind}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {comments.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}

        {comments.isError ? (
          <p className="text-sm text-destructive">
            {comments.error instanceof ApiRequestError
              ? comments.error.message
              : 'Comments could not be loaded.'}
          </p>
        ) : null}

        {comments.data?.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : null}

        {comments.data && comments.data.items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {comments.data.items.map((comment) => (
              <li key={comment.id} className="flex flex-col gap-1 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate">
                    <span className="font-medium">{comment.author?.name ?? 'Former user'}</span>
                    <time dateTime={comment.createdAt} className="ml-2 text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString()}
                    </time>
                  </p>
                  {canDeleteComment(actor, { authorId: comment.author?.id ?? null }) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(comment)}
                      aria-label={`Delete comment by ${comment.author?.name ?? 'former user'}`}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap break-words">{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            post.mutate()
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor={`comment-body-${target.id}`}>Add a comment</Label>
          <Textarea
            id={`comment-body-${target.id}`}
            value={body}
            maxLength={COMMENT_BODY_MAX}
            rows={3}
            onChange={(event) => setBody(event.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={body.trim() === '' || post.isPending}
          >
            {post.isPending ? 'Posting…' : 'Post'}
          </Button>
        </form>
      </CardContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (pendingDelete) remove.mutate(pendingDelete.id)
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
