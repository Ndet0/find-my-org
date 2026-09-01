import type { UserStatus } from '@opsflow/types/user'
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
import { currentUserQueryOptions } from '@/lib/current-user'
import { updateUserStatus, userKeys } from '@/lib/users'

const LABELS: Record<UserStatus, string> = {
  active: 'Reactivate',
  inactive: 'Deactivate',
  suspended: 'Suspend',
}

export function UserStatusDialog({
  userId,
  name,
  currentStatus,
  nextStatus,
  onClose,
}: {
  userId: string
  name: string
  currentStatus: UserStatus
  nextStatus: UserStatus | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status: UserStatus) => updateUserStatus(userId, { status }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
      await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
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

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {nextStatus ? `${LABELS[nextStatus]} ${name}?` : 'Change status'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextStatus === 'suspended'
              ? 'They will be signed out on their next request and cannot sign back in until reactivated.'
              : nextStatus === 'inactive'
                ? 'They will no longer be able to sign in. Their records stay in the directory.'
                : 'They will be able to sign in again.'}
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
