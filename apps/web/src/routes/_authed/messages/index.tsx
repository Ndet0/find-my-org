import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/messages/')({
  component: NoConversation,
})

function NoConversation() {
  return (
    <div className="hidden min-h-64 items-center justify-center rounded-lg border bg-background p-6 text-sm text-muted-foreground md:flex">
      Choose a conversation, or start a new one.
    </div>
  )
}
