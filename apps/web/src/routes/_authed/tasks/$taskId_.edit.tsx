import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { TaskForm } from '@/components/task-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { taskQueryOptions } from '@/lib/tasks'

export const Route = createFileRoute('/_authed/tasks/$taskId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'tasks:write')) {
      throw redirect({ to: '/tasks' })
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(taskQueryOptions(params.taskId)),
  component: EditTaskPage,
})

function EditTaskPage() {
  const { taskId } = Route.useParams()
  const { data: task } = useSuspenseQuery(taskQueryOptions(taskId))

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
          <CardTitle className="text-xl">Edit {task.title}</CardTitle>
          <CardDescription>
            Status and priority are changed from the task page, not this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm task={task} />
        </CardContent>
      </Card>
    </div>
  )
}
