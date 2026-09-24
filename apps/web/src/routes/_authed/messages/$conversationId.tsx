import { messageAad, sealMessage } from '@opsflow/crypto'
import { DM_BODY_MAX, type DmMessageItem, mergeMessages } from '@opsflow/types/dm'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { formatWhen } from '@/components/conversation-list'
import { useIdentity } from '@/components/messaging-gate'
import { DetailPending } from '@/components/route-feedback'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiRequestError } from '@/lib/api'
import {
  conversationKeyFor,
  conversationQueryOptions,
  dmKeys,
  fetchOlderMessages,
  latestMessagesQueryOptions,
  markConversationRead,
  type OpenedMessage,
  openMessages,
  sendMessage,
} from '@/lib/dm'
import { notificationKeys } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/messages/$conversationId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(conversationQueryOptions(params.conversationId)),
  pendingComponent: DetailPending,
  component: ThreadPage,
})

/** Keyed on the id so the loaded-older state and the draft reset between threads. */
function ThreadPage() {
  const { conversationId } = Route.useParams()
  return <Thread key={conversationId} conversationId={conversationId} />
}

/**
 * One thread. The newest page is polled; older pages are pulled in above it
 * on demand and merged by id. Every message is opened on the device with
 * the conversation key, and every message sent is sealed here first — the
 * text in the composer never leaves this tab in the clear.
 */
function Thread({ conversationId }: { conversationId: string }) {
  const { user } = Route.useRouteContext()
  const identity = useIdentity()
  const queryClient = useQueryClient()
  const conversation = useSuspenseQuery(conversationQueryOptions(conversationId))
  const latest = useQuery(latestMessagesQueryOptions(conversationId))
  const [older, setOlder] = useState<{ items: DmMessageItem[]; hasMore: boolean } | null>(null)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { peer } = conversation.data
  const key = useMemo(
    () => (peer.publicKey ? conversationKeyFor(identity, peer.publicKey) : null),
    [identity, peer.publicKey],
  )

  const messages = useMemo(
    () => mergeMessages(older?.items ?? [], latest.data?.items ?? []),
    [older, latest.data],
  )
  const openedList = useMemo(() => (key ? openMessages(key, messages) : []), [key, messages])
  const hasMore = older ? older.hasMore : (latest.data?.hasMore ?? false)
  const newestId = messages[messages.length - 1]?.id
  const oldestId = messages[0]?.id

  // Being on the thread is reading it. Re-sent only when something from the
  // other side arrives, not on every poll.
  const newestFromPeer = [...messages].reverse().find((m) => m.senderId !== user.id)?.id
  const loaded = latest.data !== undefined
  // biome-ignore lint/correctness/useExhaustiveDependencies: `newestFromPeer` is the trigger, not an input
  useEffect(() => {
    if (!loaded) return
    // Best effort: a failed read receipt is retried on the next message
    // from the other side, and is not worth an error in the thread.
    void markConversationRead(conversationId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: dmKeys.conversations })
        void queryClient.invalidateQueries({ queryKey: dmKeys.unreadCount })
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      })
      .catch(() => undefined)
  }, [conversationId, newestFromPeer, loaded, queryClient])

  // Follow the newest message; loading older ones above does not move this.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls when the newest id changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [newestId])

  const loadOlder = useMutation({
    mutationFn: () => fetchOlderMessages(conversationId, oldestId as string),
    onSuccess: (page) => {
      setOlder((previous) => ({
        items: mergeMessages(previous?.items ?? [], page.items),
        hasMore: page.hasMore,
      }))
    },
  })

  // The text is taken from the composer as the send starts, so what is typed
  // while it is in flight is kept, and a refused send puts the text back.
  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!key) throw new Error('This person has no messaging key')
      const sealed = sealMessage(key, text, messageAad(conversationId, user.id))
      return sendMessage(conversationId, { ...sealed, version: 1 })
    },
    onMutate: () => setDraft(''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dmKeys.latestMessages(conversationId) })
      void queryClient.invalidateQueries({ queryKey: dmKeys.conversations })
    },
    onError: (error, text) => {
      setDraft((current) => (current === '' ? text : current))
      toast.error(error instanceof ApiRequestError ? error.message : 'The message was not sent')
    },
  })

  const canSend = draft.trim() !== '' && !send.isPending && key !== null && peer.status === 'active'

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) send.mutate(draft.trim())
    }
  }

  return (
    <section
      aria-label={`Conversation with ${peer.name}`}
      className="flex h-[70vh] min-h-96 flex-col rounded-lg border bg-background"
    >
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link to="/messages" className="text-sm text-muted-foreground md:hidden">
          ← Back
        </Link>
        <div className="min-w-0">
          <h2 className="truncate font-medium">{peer.name}</h2>
          <p className="text-xs text-muted-foreground capitalize">
            {peer.role}
            {peer.status !== 'active' ? ' · account not active' : ''}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {hasMore ? (
          <Button
            variant="outline"
            size="sm"
            className="self-center"
            disabled={loadOlder.isPending}
            onClick={() => loadOlder.mutate()}
          >
            {loadOlder.isPending ? 'Loading…' : 'Load earlier messages'}
          </Button>
        ) : null}

        {latest.isError ? (
          <p className="text-sm text-destructive">
            {latest.error instanceof ApiRequestError
              ? latest.error.message
              : 'Messages could not be loaded.'}
          </p>
        ) : null}

        {!key ? (
          <p className="text-sm text-muted-foreground">
            {peer.name} has not set up secure messaging yet.
          </p>
        ) : null}

        {loaded && openedList.length === 0 && key ? (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello — only {peer.name} can read it.
          </p>
        ) : null}

        <ol className="flex flex-col gap-2">
          {openedList.map((message) => (
            <Bubble key={message.id} message={message} own={message.senderId === user.id} />
          ))}
        </ol>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSend) send.mutate(draft.trim())
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <Textarea
          aria-label={`Message ${peer.name}`}
          value={draft}
          rows={2}
          maxLength={DM_BODY_MAX}
          placeholder={peer.status === 'active' ? 'Write a message…' : 'This account is not active'}
          disabled={peer.status !== 'active' || !key}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          className="min-h-10 resize-none"
        />
        <Button type="submit" disabled={!canSend}>
          {send.isPending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </section>
  )
}

function Bubble({ message, own }: { message: OpenedMessage; own: boolean }) {
  return (
    <li className={cn('flex flex-col gap-0.5', own ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm',
          own ? 'bg-primary text-primary-foreground' : 'bg-muted',
          message.text === null && 'italic text-muted-foreground',
        )}
      >
        {message.text ?? 'This message could not be decrypted.'}
      </p>
      <time dateTime={message.createdAt} className="text-xs text-muted-foreground">
        {formatWhen(message.createdAt)}
      </time>
    </li>
  )
}
