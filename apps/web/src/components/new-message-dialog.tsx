import type { DmContact } from '@opsflow/types/dm'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { contactsQueryOptions, dmKeys, openConversation } from '@/lib/dm'

/**
 * Who to write to. The list is the API's answer to "whom may I message",
 * so the role rule is applied there, not here; someone who has not signed
 * in since messaging arrived has no key yet and is shown but not
 * selectable.
 */
export function NewMessageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQ(draft.trim()), 250)
    return () => clearTimeout(timer)
  }, [draft])

  // A search left behind by a cancelled dialog would greet the next open.
  useEffect(() => {
    if (!open) setDraft('')
  }, [open])

  const contacts = useQuery({ ...contactsQueryOptions(q), enabled: open })

  const start = useMutation({
    mutationFn: (userId: string) => openConversation({ userId }),
    onSuccess: async (conversation) => {
      onOpenChange(false)
      setDraft('')
      await queryClient.invalidateQueries({ queryKey: dmKeys.conversations })
      await navigate({
        to: '/messages/$conversationId',
        params: { conversationId: conversation.id },
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The conversation could not be opened',
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Only people you may message are listed. Messages are end-to-end encrypted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-search">Search</Label>
          <Input
            id="contact-search"
            type="search"
            placeholder="Name, email or position"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {contacts.isPending ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : null}

          {contacts.isError ? (
            <p className="p-3 text-sm text-destructive">
              {contacts.error instanceof ApiRequestError
                ? contacts.error.message
                : 'People could not be loaded.'}
            </p>
          ) : null}

          {contacts.data?.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              {q ? 'Nobody matches.' : 'There is nobody you can message yet.'}
            </p>
          ) : null}

          {contacts.data && contacts.data.length > 0 ? (
            <ul className="divide-y">
              {contacts.data.map((contact) => (
                <li key={contact.id}>
                  <ContactRow
                    contact={contact}
                    pending={start.isPending && start.variables === contact.id}
                    onSelect={() => start.mutate(contact.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ContactRow({
  contact,
  pending,
  onSelect,
}: {
  contact: DmContact
  pending: boolean
  onSelect: () => void
}) {
  const ready = contact.publicKey !== null

  return (
    <button
      type="button"
      disabled={!ready || pending}
      onClick={onSelect}
      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="font-medium">{contact.name}</span>
      <span className="text-xs text-muted-foreground capitalize">
        {contact.role}
        {contact.position ? ` · ${contact.position}` : ''}
        {contact.department ? ` · ${contact.department.name}` : ''}
      </span>
      {!ready ? (
        <span className="text-xs text-muted-foreground">
          Not set up yet — they need to sign in once first
        </span>
      ) : null}
      {pending ? <span className="text-xs text-muted-foreground">Opening…</span> : null}
    </button>
  )
}
