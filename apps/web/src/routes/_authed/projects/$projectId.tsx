import { can } from '@opsflow/types/permissions'
import {
  nextProjectStatuses,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type ProjectStatus,
} from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
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
import { tasksQueryOptions } from '@/lib/tasks'
import { usersQueryOptions } from '@/lib/users'

const NONE = 'none'

export const Route = createFileRoute('/_authed/projects/$projectId')({
  loader: ({ context, params }) => {
    // The tasks card fetches on its own; starting it here puts it in
    // flight before the page mounts rather than after.
    void context.queryClient.prefetchQuery(
      tasksQueryOptions({ projectId: params.projectId, pageSize: 100 }),
    )
    return context.queryClient.ensureQueryData(projectQueryOptions(params.projectId))
  },
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const { user: actor } = Route.useRouteContext()
  const { data: project } = useSuspenseQuery(projectQueryOptions(projectId))
  const canWrite = can(actor.role.name, 'projects:write')
  const canWriteTasks = can(actor.role.name, 'tasks:write')
  const [nextStatus, setNextStatus] = useState<ProjectStatus | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/projects" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        Back to projects
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{project.name}</CardTitle>
            <CardDescription>{project.client?.name ?? 'No client assigned'}</CardDescription>
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
              <StatusBadge status={project.status} />
            </dd>

            <dt className="text-muted-foreground">Priority</dt>
            <dd>
              {canWrite ? (
                <PriorityControl
                  projectId={project.id}
                  name={project.name}
                  priority={project.priority}
                />
              ) : (
                <PriorityBadge priority={project.priority} />
              )}
            </dd>

            <dt className="text-muted-foreground">Progress</dt>
            <dd>
              <ProgressBar value={project.progress} />
            </dd>

            <dt className="text-muted-foreground">Manager</dt>
            <dd>{project.manager?.name ?? 'Unassigned'}</dd>

            <dt className="text-muted-foreground">Start date</dt>
            <dd>{project.startDate ?? 'Not set'}</dd>

            <dt className="text-muted-foreground">Deadline</dt>
            <dd>{project.deadline ?? 'Not set'}</dd>

            <dt className="text-muted-foreground">Tasks</dt>
            <dd>{project.taskCount}</dd>

            <dt className="text-muted-foreground">Description</dt>
            <dd className="whitespace-pre-wrap">{project.description ?? 'None'}</dd>
          </dl>
        </CardContent>
      </Card>

      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          {nextProjectStatuses(project.status).length ? (
            nextProjectStatuses(project.status).map((status) => (
              <Button
                key={status}
                variant={status === 'cancelled' || status === 'delayed' ? 'destructive' : 'outline'}
                size="sm"
                className="capitalize"
                onClick={() => setNextStatus(status)}
              >
                {status.replaceAll('_', ' ')}
              </Button>
            ))
          ) : (
            // `cancelled` is the one terminal status. Say so, rather than
            // leaving the row where the controls were silently empty.
            <p className="text-muted-foreground text-sm">
              A cancelled project cannot be reopened. Its team and history stay in place.
            </p>
          )}
        </div>
      ) : null}

      <MembersCard
        projectId={project.id}
        canWrite={canWrite}
        memberIds={project.members.map((member) => member.user.id)}
        members={project.members}
      />

      <TasksCard projectId={project.id} canWrite={canWriteTasks} />

      <ProjectStatusDialog
        projectId={project.id}
        name={project.name}
        currentStatus={project.status}
        nextStatus={nextStatus}
        onClose={() => setNextStatus(null)}
      />
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

function TasksCard({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const tasks = useQuery(tasksQueryOptions({ projectId, pageSize: 100 }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Tasks</CardTitle>
          <CardDescription>
            {tasks.data
              ? `${tasks.data.total} ${tasks.data.total === 1 ? 'task' : 'tasks'}`
              : 'Work on this project'}
          </CardDescription>
        </div>
        {canWrite ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/tasks/new" search={{ projectId }}>
              Add task
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {tasks.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}

        {tasks.isError ? (
          <p className="text-sm text-destructive">
            {tasks.error instanceof ApiRequestError
              ? tasks.error.message
              : 'Tasks could not be loaded.'}
          </p>
        ) : null}

        {tasks.data?.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks on this project yet.</p>
        ) : null}

        {tasks.data && tasks.data.items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {tasks.data.items.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    <span className="text-muted-foreground">
                      {task.assignee?.name ?? 'Unassigned'}
                    </span>
                    <ProjectTaskDue value={task.dueDate} status={task.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ProjectTaskDue({ value, status }: { value: string | null; status: TaskStatus }) {
  if (!value) {
    return null
  }

  const overdue = status !== 'completed' && value < new Date().toISOString().slice(0, 10)

  return <span className={overdue ? 'text-destructive' : 'text-muted-foreground'}>{value}</span>
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
