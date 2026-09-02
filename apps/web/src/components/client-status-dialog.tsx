import type { ClientStatus } from '@opsflow/types/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { ApiRequestError } from '@/lib/api'
import { clientKeys, updateClientStatus } from '@/lib/clients'

const LABELS: Record<ClientStatus, string> = {
  active: 'Reactivate',
  inactive: 'Deactivate',
  archived: 'Archive',
}

export function ClientStatusDialog({
  clientId,
  name,
  projectCount,
  currentStatus,
  nextStatus,
  onClose,
}: {
  clientId: string
  name: string
  projectCount: number
  currentStatus: ClientStatus
  nextStatus: ClientStatus | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status: ClientStatus) => updateClientStatus(clientId, { status }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      toast.success(`${saved.name} is now ${saved.status}`)
      onClose()
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The status could not be changed',
      )
    },
  })

  const open = nextStatus !== null && nextStatus !== currentStatus
  const projectsNote =
    projectCount === 0
      ? 'Their records stay in the directory.'
      : projectCount === 1
        ? 'Their one project stays in the system.'
        : `Their ${projectCount} projects stay in the system.`

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {nextStatus ? `${LABELS[nextStatus]} ${name}?` : 'Change status'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextStatus === 'archived'
              ? `They will no longer appear as an active client. ${projectsNote}`
              : nextStatus === 'inactive'
                ? `They will no longer appear as an active client. ${projectsNote}`
                : 'They will appear as an active client again.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={nextStatus === 'active' ? 'default' : 'destructive'}
            disabled={!nextStatus || mutation.isPending}
            onClick={(event) => {
              event.preventDefault()
              if (nextStatus) {
                mutation.mutate(nextStatus)
              }
            }}
          >
            {mutation.isPending ? 'Saving…' : nextStatus ? LABELS[nextStatus] : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
