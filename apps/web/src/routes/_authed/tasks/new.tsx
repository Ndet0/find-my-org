import { can } from '@opsflow/types/permissions'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { TaskForm } from '@/components/task-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const searchSchema = z.object({
  projectId: z.uuid().optional(),
})

export const Route = createFileRoute('/_authed/tasks/new')({
  validateSearch: (search): z.infer<typeof searchSchema> => searchSchema.parse(search),
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'tasks:write')) {
      throw redirect({ to: '/tasks' })
    }
  },
  component: NewTaskPage,
})

function NewTaskPage() {
  const { projectId } = Route.useSearch()

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link to="/tasks" className="text-sm text-muted-foreground hover:text-foreground">
        Back to tasks
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a task</CardTitle>
          <CardDescription>
            A new task starts as pending. Status and priority changes happen from the task page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm defaultProjectId={projectId} />
        </CardContent>
      </Card>
    </div>
  )
}
