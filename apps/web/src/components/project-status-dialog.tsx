import type { ProjectStatus } from '@opsflow/types/project'
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
import { clientKeys } from '@/lib/clients'
import { projectKeys, updateProjectStatus } from '@/lib/projects'

const LABELS: Record<ProjectStatus, string> = {
  planning: 'Move to planning',
  active: 'Mark active',
  on_hold: 'Put on hold',
  completed: 'Mark completed',
  delayed: 'Mark delayed',
  cancelled: 'Cancel project',
}

export function ProjectStatusDialog({
  projectId,
  name,
  currentStatus,
  nextStatus,
  onClose,
}: {
  projectId: string
  name: string
  currentStatus: ProjectStatus
  nextStatus: ProjectStatus | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status: ProjectStatus) => updateProjectStatus(projectId, { status }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      toast.success(`${saved.name} is now ${saved.status.replaceAll('_', ' ')}`)
      onClose()
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The status could not be changed',
      )
    },
  })

  const open = nextStatus !== null && nextStatus !== currentStatus
  const destructive = nextStatus === 'cancelled' || nextStatus === 'delayed'

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {nextStatus ? `${LABELS[nextStatus]} ${name}?` : 'Change status'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextStatus === 'cancelled'
              ? 'The project stays in the system with its team and history. It will no longer appear as active work.'
              : 'This updates the project lifecycle. Team members and records stay in place.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
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
