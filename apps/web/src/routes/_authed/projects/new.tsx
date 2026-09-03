import { can } from '@opsflow/types/permissions'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ProjectForm } from '@/components/project-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/projects/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'projects:write')) {
      throw redirect({ to: '/projects' })
    }
  },
  component: NewProjectPage,
})

function NewProjectPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
        Back to projects
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a project</CardTitle>
          <CardDescription>
            A new project starts in planning at 0% progress. The team and status changes are managed
            from the project page after it exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </div>
  )
}
