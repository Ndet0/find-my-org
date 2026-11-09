import { can } from '@opsflow/types/permissions'
import {
  nextProjectStatuses,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type ProjectStatus,
} from '@opsflow/types/project'
import type { TaskListItem, TaskStatus } from '@opsflow/types/task'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AvatarChip } from '@/components/avatar-chip'
import { CommentsCard } from '@/components/comments-card'
import { DetailLayout, Properties, Property } from '@/components/detail-layout'
import { ProgressBar } from '@/components/progress-bar'
import { ProjectStatusDialog } from '@/components/project-status-dialog'
import { DetailPending } from '@/components/route-feedback'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
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
  pendingComponent: DetailPending,
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
    <DetailLayout
      main={
        <>
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[20px] font-medium tracking-tight">{project.name}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {project.client?.name ?? 'No client assigned'}
              </p>
            </div>
            {canWrite ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/projects/$projectId/edit" params={{ projectId }}>
                  Edit
                </Link>
              </Button>
            ) : null}
          </header>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium">Description</h2>
            <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">
              {project.description ?? 'None'}
            </p>
          </section>

          <TasksCard projectId={project.id} canWrite={canWriteTasks} />

          <CommentsCard
            target={{ kind: 'project', id: project.id }}
            actor={{ id: actor.id, role: actor.role.name }}
          />
        </>
      }
      side={
        <>
          <Properties>
            <Property label="Status">
              <StatusBadge status={project.status} />
            </Property>
            <Property label="Priority">
              {canWrite ? (
                <PriorityControl
                  projectId={project.id}
                  name={project.name}
                  priority={project.priority}
                />
              ) : (
                <PriorityBadge priority={project.priority} />
              )}
            </Property>
            <Property label="Lead">
              {project.manager?.name ? <AvatarChip name={project.manager.name} /> : 'Unassigned'}
            </Property>
            <Property label="Start">{project.startDate ?? 'Not set'}</Property>
            <Property label="Deadline">{project.deadline ?? 'Not set'}</Property>
            <Property label="Tasks">{project.taskCount}</Property>
          </Properties>

          <section className="rounded-lg border px-3 py-2.5">
            <h2 className="text-[12px] font-medium text-muted-foreground">Progress</h2>
            <div className="mt-2">
              <ProgressBar value={project.progress} />
            </div>
          </section>

          {canWrite ? (
            <div className="flex flex-col gap-1">
              {nextProjectStatuses(project.status).length ? (
                nextProjectStatuses(project.status).map((status) => (
                  <Button
                    key={status}
                    variant={
                      status === 'cancelled' || status === 'delayed' ? 'destructive' : 'ghost'
                    }
                    size="sm"
                    className="justify-start capitalize"
                    onClick={() => setNextStatus(status)}
                  >
                    {status.replaceAll('_', ' ')}
                  </Button>
                ))
              ) : (
                <p className="text-[13px] text-muted-foreground">
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

          <ProjectStatusDialog
            projectId={project.id}
            name={project.name}
            currentStatus={project.status}
            nextStatus={nextStatus}
            onClose={() => setNextStatus(null)}
          />
        </>
      }
    />
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

  const grouped = new Map<TaskStatus, TaskListItem[]>()
  for (const task of tasks.data?.items ?? []) {
    const list = grouped.get(task.status) ?? []
    list.push(task)
    grouped.set(task.status, list)
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium">
          Tasks
          {tasks.data ? (
            <span className="ml-2 font-normal text-muted-foreground">{tasks.data.total}</span>
          ) : null}
        </h2>
        {canWrite ? (
          <Button asChild variant="ghost" size="sm">
            <Link to="/tasks/new" search={{ projectId }}>
              Add task
            </Link>
          </Button>
        ) : null}
      </div>

      {tasks.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : null}

      {tasks.isError ? (
        <p className="text-[13px] text-destructive">
          {tasks.error instanceof ApiRequestError
            ? tasks.error.message
            : 'Tasks could not be loaded.'}
        </p>
      ) : null}

      {tasks.data?.items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No tasks on this project yet.</p>
      ) : null}

      {[...grouped.entries()].map(([status, items]) => (
        <TaskGroup key={status} status={status} items={items} />
      ))}
    </section>
  )
}

function TaskGroup({ status, items }: { status: TaskStatus; items: TaskListItem[] }) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[12px] text-muted-foreground transition-colors duration-150 hover:bg-accent"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <ChevronDown
          className={`size-3.5 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
        <StatusBadge status={status} />
        <span>{items.length}</span>
      </button>
      {open ? (
        <ul className="flex flex-col">
          {items.map((task) => (
            <li key={task.id}>
              <Link
                to="/tasks/$taskId"
                params={{ taskId: task.id }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150 hover:bg-accent"
              >
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  {task.assignee ? <AvatarChip name={task.assignee.name} /> : 'Unassigned'}
                </span>
                <ProjectTaskDue value={task.dueDate} status={task.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
    <section className="flex flex-col gap-2">
      <h2 className="px-1.5 text-[12px] font-medium text-muted-foreground">
        {members.length === 0
          ? 'No one has been assigned yet.'
          : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
      </h2>
      <div className="flex flex-col gap-2">
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
      </div>
    </section>
  )
}
