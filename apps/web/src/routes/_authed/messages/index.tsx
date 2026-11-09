import { createFileRoute } from '@tanstack/react-router'
import { Inbox } from 'lucide-react'

export const Route = createFileRoute('/_authed/messages/')({
  component: NoConversation,
})

function NoConversation() {
  return (
    <div className="hidden min-h-64 flex-col items-center justify-center gap-2 p-6 text-center md:flex">
      <Inbox className="size-5 text-muted-foreground" aria-hidden />
      <p className="text-[13px] text-muted-foreground">
        Choose a conversation, or start a new one.
      </p>
    </div>
  )
}
