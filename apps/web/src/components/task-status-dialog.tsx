import type { TaskStatus } from '@opsflow/types/task'
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
import { projectKeys } from '@/lib/projects'
import { taskKeys, updateTaskStatus } from '@/lib/tasks'

const LABELS: Record<TaskStatus, string> = {
  pending: 'Move to pending',
  in_progress: 'Start work',
  blocked: 'Mark blocked',
  completed: 'Mark completed',
}

export function TaskStatusDialog({
  taskId,
  title,
  currentStatus,
  nextStatus,
  onClose,
}: {
  taskId: string
  title: string
  currentStatus: TaskStatus
  nextStatus: TaskStatus | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status: TaskStatus) => updateTaskStatus(taskId, { status }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(`${saved.title} is now ${saved.status.replaceAll('_', ' ')}`)
      onClose()
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The status could not be changed',
      )
    },
  })

  const open = nextStatus !== null && nextStatus !== currentStatus
  const destructive = nextStatus === 'blocked'

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {nextStatus ? `${LABELS[nextStatus]} ${title}?` : 'Change status'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextStatus === 'completed'
              ? 'This records a completion time. The task stays on the project.'
              : nextStatus === 'blocked'
                ? 'The task stays assigned. Work can resume by moving it back to in progress.'
                : 'This updates the task lifecycle. The assignment and due date stay in place.'}
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
