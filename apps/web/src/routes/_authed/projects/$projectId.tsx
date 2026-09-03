import { can } from '@opsflow/types/permissions'
import {
  PRIORITY_LEVELS,
  PROJECT_STATUSES,
  type PriorityLevel,
  type ProjectStatus,
} from '@opsflow/types/project'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProgressBar } from '@/components/progress-bar'
import { ProjectStatusDialog } from '@/components/project-status-dialog'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError } from '@/lib/api'
import { clientKeys } from '@/lib/clients'
import {
  addProjectMember,
  projectKeys,
  projectQueryOptions,
  removeProjectMember,
  updateProjectPriority,
} from '@/lib/projects'
import { usersQueryOptions } from '@/lib/users'

const NONE = 'none'

export const Route = createFileRoute('/_authed/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const project = useQuery(projectQueryOptions(projectId))
  const canWrite = can(actor.role.name, 'projects:write')
  const [nextStatus, setNextStatus] = useState<ProjectStatus | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/projects" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to projects
      </Link>

      {project.isPending ? <DetailSkeleton /> : null}

      {project.isError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unavailable</CardTitle>
            <CardDescription>{describeError(project.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {project.data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{project.data.name}</CardTitle>
                <CardDescription>
                  {project.data.client?.name ?? 'No client assigned'}
                </CardDescription>
              </div>
              {canWrite ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/projects/$projectId/edit" params={{ projectId }}>
                    Edit
                  </Link>
                </Button>
              ) : null}
            </CardHeader>

            <CardContent>
              <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={project.data.status} />
                </dd>

                <dt className="text-muted-foreground">Priority</dt>
                <dd>
                  {canWrite ? (
                    <PriorityControl
                      projectId={project.data.id}
                      name={project.data.name}
                      priority={project.data.priority}
                    />
                  ) : (
                    <PriorityBadge priority={project.data.priority} />
                  )}
                </dd>

                <dt className="text-muted-foreground">Progress</dt>
                <dd>
                  <ProgressBar value={project.data.progress} />
                </dd>

                <dt className="text-muted-foreground">Manager</dt>
                <dd>{project.data.manager?.name ?? 'Unassigned'}</dd>

                <dt className="text-muted-foreground">Start date</dt>
                <dd>{project.data.startDate ?? 'Not set'}</dd>

                <dt className="text-muted-foreground">Deadline</dt>
                <dd>{project.data.deadline ?? 'Not set'}</dd>

                <dt className="text-muted-foreground">Tasks</dt>
                <dd>{project.data.taskCount}</dd>

                <dt className="text-muted-foreground">Description</dt>
                <dd className="whitespace-pre-wrap">{project.data.description ?? 'None'}</dd>
              </dl>
            </CardContent>
          </Card>

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUSES.filter((status) => status !== project.data.status).map((status) => (
                <Button
                  key={status}
                  variant={
                    status === 'cancelled' || status === 'delayed' ? 'destructive' : 'outline'
                  }
                  size="sm"
                  className="capitalize"
                  onClick={() => setNextStatus(status)}
                >
                  {status.replaceAll('_', ' ')}
                </Button>
              ))}
            </div>
          ) : null}

          <MembersCard
            projectId={project.data.id}
            canWrite={canWrite}
            memberIds={project.data.members.map((member) => member.user.id)}
            members={project.data.members}
          />

          <ProjectStatusDialog
            projectId={project.data.id}
            name={project.data.name}
            currentStatus={project.data.status}
            nextStatus={nextStatus}
            onClose={() => setNextStatus(null)}
          />
        </>
      ) : null}
    </div>
  )
}

function PriorityControl({
  projectId,
  name,
  priority,
}: {
  projectId: string
  name: string
  priority: PriorityLevel
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (next: PriorityLevel) => updateProjectPriority(projectId, { priority: next }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(`${saved.name} is now ${saved.priority} priority`)
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
      <SelectTrigger className="w-40 capitalize" aria-label={`Priority for ${name}`}>
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

function MembersCard({
  projectId,
  canWrite,
  memberIds,
  members,
}: {
  projectId: string
  canWrite: boolean
  memberIds: string[]
  members: { id: string; user: { id: string; name: string } }[]
}) {
  const queryClient = useQueryClient()
  const people = useQuery({
    ...usersQueryOptions({ status: 'active', pageSize: 100 }),
    enabled: canWrite,
  })
  const [selected, setSelected] = useState(NONE)
  const memberSet = new Set(memberIds)
  const candidates = (people.data?.items ?? []).filter((person) => !memberSet.has(person.id))

  const add = useMutation({
    mutationFn: (userId: string) => addProjectMember(projectId, { userId }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      toast.success(`${saved.name} has a new team member`)
      setSelected(NONE)
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The person could not be added',
      )
    },
  })

  const remove = useMutation({
    mutationFn: (userId: string) => removeProjectMember(projectId, userId),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(`A member was removed from ${saved.name}`)
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The person could not be removed',
      )
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Team</CardTitle>
        <CardDescription>
          {members.length === 0
            ? 'No one has been assigned yet.'
            : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {members.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{member.user.name}</span>
                {canWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(member.user.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {canWrite ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label>Add a member</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Choose a person</SelectItem>
                  {candidates.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={selected === NONE || add.isPending}
              onClick={() => add.mutate(selected)}
            >
              {add.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 8 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function describeError(error: Error): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'FORBIDDEN') {
      return 'You do not have permission to view this project.'
    }

    if (error.code === 'PROJECT_NOT_FOUND') {
      return 'That project is no longer in the system.'
    }
  }

  return error.message
}
