import type { DmConversationItem } from '@opsflow/types/dm'
import type { CurrentUser } from '@opsflow/types/user'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Inbox, Plus } from 'lucide-react'
import { AvatarChip } from '@/components/avatar-chip'
import { useIdentity } from '@/components/messaging-gate'
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
    <nav aria-label="Conversations" className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="text-[13px] font-medium">Inbox</span>
        <Button size="sm" variant="ghost" onClick={onCompose}>
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
        <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
          <Inbox className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-[13px] text-muted-foreground">No conversations yet.</p>
          <Button size="sm" variant="ghost" onClick={onCompose}>
            New message
          </Button>
        </div>
      ) : null}

      {conversations.data && conversations.data.length > 0 ? (
        <ul className="flex flex-col">
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
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150 hover:bg-accent"
      activeProps={{ className: 'bg-accent' }}
    >
      {conversation.unread > 0 ? (
        <span className="size-1.5 shrink-0 rounded-full bg-primary" title="Unread" />
      ) : (
        <span className="size-1.5 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <AvatarChip
            name={peer.name}
            className={cn(
              conversation.unread > 0 ? 'font-medium text-foreground' : 'text-foreground',
            )}
          />
          {lastMessage ? (
            <time
              dateTime={lastMessage.createdAt}
              className="shrink-0 text-[12px] text-muted-foreground"
            >
              {formatWhen(lastMessage.createdAt)}
            </time>
          ) : null}
        </span>
        <span className="block truncate pl-6 text-[12px] text-muted-foreground">{preview}</span>
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
