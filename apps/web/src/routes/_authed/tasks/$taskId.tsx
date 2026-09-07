import { can } from '@opsflow/types/permissions'
import { PRIORITY_LEVELS, type PriorityLevel } from '@opsflow/types/project'
import { nextTaskStatuses, type TaskStatus } from '@opsflow/types/task'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/tasks" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to tasks
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{task.title}</CardTitle>
            <CardDescription>
              <Link
                to="/projects/$projectId"
                params={{ projectId: task.project.id }}
                className="hover:underline"
              >
                {task.project.name}
              </Link>
            </CardDescription>
          </div>
          {canWrite ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/tasks/$taskId/edit" params={{ taskId }}>
                Edit
              </Link>
            </Button>
          ) : null}
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={task.status} />
            </dd>

            <dt className="text-muted-foreground">Priority</dt>
            <dd>
              {canWrite ? (
                <PriorityControl taskId={task.id} title={task.title} priority={task.priority} />
              ) : (
                <PriorityBadge priority={task.priority} />
              )}
            </dd>

            <dt className="text-muted-foreground">Assignee</dt>
            <dd>{task.assignee?.name ?? 'Unassigned'}</dd>

            <dt className="text-muted-foreground">Due date</dt>
            <dd>
              <DueDate value={task.dueDate} status={task.status} />
            </dd>

            <dt className="text-muted-foreground">Created by</dt>
            <dd>{task.creator?.name ?? 'Unknown'}</dd>

            <dt className="text-muted-foreground">Completed</dt>
            <dd>{task.completedAt ? task.completedAt.slice(0, 10) : '—'}</dd>

            <dt className="text-muted-foreground">Description</dt>
            <dd className="whitespace-pre-wrap">{task.description ?? 'None'}</dd>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {nextTaskStatuses(task.status).map((status) => (
          <Button
            key={status}
            variant={status === 'blocked' ? 'destructive' : 'outline'}
            size="sm"
            className="capitalize"
            onClick={() => setNextStatus(status)}
          >
            {status.replaceAll('_', ' ')}
          </Button>
        ))}
        {canWrite ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
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
    </div>
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
