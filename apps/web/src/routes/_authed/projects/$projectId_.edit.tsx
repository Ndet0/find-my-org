import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ProjectForm } from '@/components/project-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { projectQueryOptions } from '@/lib/projects'

export const Route = createFileRoute('/_authed/projects/$projectId_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'projects:write')) {
      throw redirect({ to: '/projects' })
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(projectQueryOptions(params.projectId)),
  component: EditProjectPage,
})

function EditProjectPage() {
  const { projectId } = Route.useParams()
  const { data: project } = useSuspenseQuery(projectQueryOptions(projectId))

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
          <CardTitle className="text-xl">Edit {project.name}</CardTitle>
          <CardDescription>
            Status and priority are changed from the project page, not this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm project={project} />
        </CardContent>
      </Card>
    </div>
  )
}
