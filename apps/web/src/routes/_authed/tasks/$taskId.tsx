import { can } from '@opsflow/types/permissions'
import { PRIORITY_LEVELS, type PriorityLevel } from '@opsflow/types/project'
import { nextTaskStatuses, type TaskStatus } from '@opsflow/types/task'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { AvatarChip } from '@/components/avatar-chip'
import { CommentsCard } from '@/components/comments-card'
import { DetailLayout, Properties, Property } from '@/components/detail-layout'
import { DetailPending } from '@/components/route-feedback'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { TaskStatusDialog } from '@/components/task-status-dialog'
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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiRequestError } from '@/lib/api'
import { projectKeys } from '@/lib/projects'
import { deleteTask, taskKeys, taskQueryOptions, updateTaskPriority } from '@/lib/tasks'

export const Route = createFileRoute('/_authed/tasks/$taskId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(taskQueryOptions(params.taskId)),
  pendingComponent: DetailPending,
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskId))
  const canWrite = can(actor.role.name, 'tasks:write')
  const [nextStatus, setNextStatus] = useState<TaskStatus | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <DetailLayout
      main={
        <>
          <header>
            <h1 className="text-[20px] font-medium tracking-tight">{task.title}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <Link
                to="/projects/$projectId"
                params={{ projectId: task.project.id }}
                className="hover:text-foreground"
              >
                {task.project.name}
              </Link>
            </p>
          </header>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium">Description</h2>
            <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">
              {task.description ?? 'None'}
            </p>
          </section>

          <CommentsCard
            target={{ kind: 'task', id: task.id }}
            actor={{ id: actor.id, role: actor.role.name }}
          />
        </>
      }
      side={
        <>
          <Properties>
            <Property label="Status">
              <StatusBadge status={task.status} />
            </Property>
            <Property label="Priority">
              {canWrite ? (
                <PriorityControl taskId={task.id} title={task.title} priority={task.priority} />
              ) : (
                <PriorityBadge priority={task.priority} />
              )}
            </Property>
            <Property label="Assignee">
              {task.assignee?.name ? <AvatarChip name={task.assignee.name} /> : 'Unassigned'}
            </Property>
            <Property label="Due">
              <DueDate value={task.dueDate} status={task.status} />
            </Property>
            <Property label="Created by">
              {task.creator?.name ? <AvatarChip name={task.creator.name} /> : 'Unknown'}
            </Property>
            <Property label="Completed">
              {task.completedAt ? task.completedAt.slice(0, 10) : '—'}
            </Property>
          </Properties>

          <div className="flex flex-col gap-1">
            {canWrite ? (
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link to="/tasks/$taskId/edit" params={{ taskId }}>
                  Edit
                </Link>
              </Button>
            ) : null}
            {nextTaskStatuses(task.status).map((status) => (
              <Button
                key={status}
                variant={status === 'blocked' ? 'destructive' : 'ghost'}
                size="sm"
                className="justify-start capitalize"
                onClick={() => setNextStatus(status)}
              >
                {status.replaceAll('_', ' ')}
              </Button>
            ))}
            {canWrite ? (
              <Button
                variant="destructive"
                size="sm"
                className="justify-start"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            ) : null}
          </div>

          <TaskStatusDialog
            taskId={task.id}
            title={task.title}
            currentStatus={task.status}
            nextStatus={nextStatus}
            onClose={() => setNextStatus(null)}
          />

          <DeleteTaskDialog
            taskId={task.id}
            title={task.title}
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
          />
        </>
      }
    />
  )
}

function PriorityControl({
  taskId,
  title,
  priority,
}: {
  taskId: string
  title: string
  priority: PriorityLevel
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (next: PriorityLevel) => updateTaskPriority(taskId, { priority: next }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success(`${saved.title} is now ${saved.priority} priority`)
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The priority could not be changed',
      )
    },
  })

  return (
    <Select
      value={priority}
      onValueChange={(value) => mutation.mutate(value as PriorityLevel)}
      disabled={mutation.isPending}
    >
      <SelectTrigger className="w-40 capitalize" aria-label={`Priority for ${title}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_LEVELS.map((level) => (
          <SelectItem key={level} value={level} className="capitalize">
            {level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DeleteTaskDialog({
  taskId,
  title,
  open,
  onClose,
}: {
  taskId: string
  title: string
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: async (deleted) => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(`${deleted.title} was deleted`)
      onClose()
      await router.navigate({ to: '/tasks' })
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The task could not be deleted',
      )
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {title}?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DueDate({ value, status }: { value: string | null; status: TaskStatus }) {
  if (!value) {
    return 'Not set'
  }

  const overdue = status !== 'completed' && value < new Date().toISOString().slice(0, 10)

  return overdue ? <span className="text-destructive">{value} · overdue</span> : value
}
