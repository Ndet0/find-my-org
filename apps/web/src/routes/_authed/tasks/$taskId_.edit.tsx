import { can } from '@opsflow/types/permissions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { TaskForm } from '@/components/task-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { taskQueryOptions } from '@/lib/tasks'

export const Route = createFileRoute('/_authed/tasks/$taskId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'tasks:write')) {
      throw redirect({ to: '/tasks' })
    }
  },
  component: EditTaskPage,
})

function EditTaskPage() {
  const { taskId } = Route.useParams()
  const task = useQuery(taskQueryOptions(taskId))

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link
        to="/tasks/$taskId"
        params={{ taskId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to task
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit {task.data?.title ?? 'task'}</CardTitle>
          <CardDescription>
            Status and priority are changed from the task page, not this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {task.isPending ? <Skeleton className="h-64 w-full" /> : null}
          {task.isError ? (
            <p className="text-sm text-destructive">
              {task.error instanceof ApiRequestError
                ? task.error.message
                : 'This task could not be loaded.'}
            </p>
          ) : null}
          {task.data ? <TaskForm task={task.data} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
