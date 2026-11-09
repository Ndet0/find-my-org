import { createFileRoute, Outlet, useMatch } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { ConversationList } from '@/components/conversation-list'
import { MessagingGate } from '@/components/messaging-gate'
import { NewMessageDialog } from '@/components/new-message-dialog'
import { cn } from '@/lib/utils'

/**
 * Direct messages: the conversation list beside whichever thread is open.
 * Everything below the heading waits on `MessagingGate`, which holds the
 * key that opens the ciphertext the API relays. On a narrow screen there is
 * room for one pane: the list, or the open thread with its "Back" link.
 */
export const Route = createFileRoute('/_authed/messages')({
  component: MessagesLayout,
})

function MessagesLayout() {
  const { user } = Route.useRouteContext()
  const [composing, setComposing] = useState(false)
  const threadOpen =
    useMatch({ from: '/_authed/messages/$conversationId', shouldThrow: false }) !== undefined

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-[32rem] flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div>
          <h1 className="text-[15px] font-medium tracking-tight">Messages</h1>
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            End-to-end encrypted. Only you and the person you write to can read them.
          </p>
        </div>
      </header>

      <MessagingGate user={user}>
        <div className="grid min-h-0 flex-1 items-stretch md:grid-cols-[280px_minmax(0,1fr)]">
          <div className={cn(threadOpen && 'hidden md:block')}>
            <ConversationList user={user} onCompose={() => setComposing(true)} />
          </div>
          <Outlet />
        </div>
        <NewMessageDialog open={composing} onOpenChange={setComposing} />
      </MessagingGate>
    </div>
  )
}
