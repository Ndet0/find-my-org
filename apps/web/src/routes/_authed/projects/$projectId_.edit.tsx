import { can } from '@opsflow/types/permissions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ProjectForm } from '@/components/project-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { projectQueryOptions } from '@/lib/projects'

export const Route = createFileRoute('/_authed/projects/$projectId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'projects:write')) {
      throw redirect({ to: '/projects' })
    }
  },
  component: EditProjectPage,
})

function EditProjectPage() {
  const { projectId } = Route.useParams()
  const project = useQuery(projectQueryOptions(projectId))

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link
        to="/projects/$projectId"
        params={{ projectId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to project
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit {project.data?.name ?? 'project'}</CardTitle>
          <CardDescription>
            Status and priority are changed from the project page, not this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.isPending ? <Skeleton className="h-64 w-full" /> : null}
          {project.isError ? (
            <p className="text-sm text-destructive">
              {project.error instanceof ApiRequestError
                ? project.error.message
                : 'This project could not be loaded.'}
            </p>
          ) : null}
          {project.data ? <ProjectForm project={project.data} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
