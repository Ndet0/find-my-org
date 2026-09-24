import type { DmConversationItem } from '@opsflow/types/dm'
import type { CurrentUser } from '@opsflow/types/user'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useIdentity } from '@/components/messaging-gate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { conversationKeyFor, conversationsQueryOptions, openMessages } from '@/lib/dm'
import { cn } from '@/lib/utils'

/**
 * Every thread the person is part of, most recent activity first. The
 * preview is the last message, opened here; the server sent ciphertext.
 */
export function ConversationList({
  user,
  onCompose,
}: {
  user: CurrentUser
  onCompose: () => void
}) {
  const conversations = useQuery(conversationsQueryOptions())

  return (
    <nav aria-label="Conversations" className="flex flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">Conversations</span>
        <Button size="sm" variant="outline" onClick={onCompose}>
          <Plus className="size-4" aria-hidden />
          New
        </Button>
      </div>

      {conversations.isPending ? (
        <div className="flex flex-col gap-2 p-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ) : null}

      {conversations.isError ? (
        <p className="p-3 text-sm text-destructive">
          {conversations.error instanceof ApiRequestError
            ? conversations.error.message
            : 'Conversations could not be loaded.'}
        </p>
      ) : null}

      {conversations.data?.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">
          No conversations yet. Start one with New.
        </p>
      ) : null}

      {conversations.data && conversations.data.length > 0 ? (
        <ul className="flex flex-col divide-y">
          {conversations.data.map((conversation) => (
            <li key={conversation.id}>
              <ConversationRow conversation={conversation} user={user} />
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  )
}

function ConversationRow({
  conversation,
  user,
}: {
  conversation: DmConversationItem
  user: CurrentUser
}) {
  const identity = useIdentity()
  const { peer, lastMessage } = conversation
  const preview = previewOf(identity, peer.publicKey, lastMessage, user.id)

  return (
    <Link
      to="/messages/$conversationId"
      params={{ conversationId: conversation.id }}
      className={cn(
        'flex flex-col gap-0.5 px-3 py-2 text-sm transition-colors hover:bg-accent',
        conversation.unread > 0 && 'bg-muted/40',
      )}
      activeProps={{ className: 'bg-accent' }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn('truncate', conversation.unread > 0 ? 'font-semibold' : 'font-medium')}>
          {peer.name}
        </span>
        {conversation.unread > 0 ? (
          <Badge variant="default" className="h-5 min-w-5 px-1">
            {conversation.unread > 99 ? '99+' : conversation.unread}
          </Badge>
        ) : null}
      </span>
      <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{preview}</span>
        {lastMessage ? (
          <time dateTime={lastMessage.createdAt} className="shrink-0">
            {formatWhen(lastMessage.createdAt)}
          </time>
        ) : null}
      </span>
    </Link>
  )
}

function previewOf(
  identity: ReturnType<typeof useIdentity>,
  peerPublicKey: string | null,
  lastMessage: DmConversationItem['lastMessage'],
  userId: string,
): string {
  if (!lastMessage) {
    return 'No messages yet'
  }

  if (!peerPublicKey) {
    return 'Encrypted message'
  }

  const [opened] = openMessages(conversationKeyFor(identity, peerPublicKey), [lastMessage])
  const text = opened?.text ?? null

  if (text === null) {
    return 'Message could not be decrypted'
  }

  const flat = text.replace(/\s+/g, ' ').trim()
  return `${lastMessage.senderId === userId ? 'You: ' : ''}${flat}`
}

/** Today's time, otherwise the date. */
export function formatWhen(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString()
}
