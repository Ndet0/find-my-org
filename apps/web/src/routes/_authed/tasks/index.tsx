import { can } from '@opsflow/types/permissions'
import { PRIORITY_LEVELS, type PriorityLevel } from '@opsflow/types/project'
import { TASK_STATUSES, type TaskListFilters, type TaskStatus } from '@opsflow/types/task'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiRequestError } from '@/lib/api'
import { projectsQueryOptions } from '@/lib/projects'
import { tasksQueryOptions } from '@/lib/tasks'
import { usersQueryOptions } from '@/lib/users'

/**
 * Filters live in the URL rather than component state, so a filtered view can
 * be bookmarked, shared and restored by the back button.
 */
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  projectId: z.string().optional(),
  assignedTo: z.string().optional(),
  overdue: z.enum(['true']).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

/** Radix Select cannot hold an empty value, so "no filter" needs a sentinel. */
const ANY = 'any'

export const Route = createFileRoute('/_authed/tasks/')({
  validateSearch: (search): z.infer<typeof searchSchema> => searchSchema.parse(search),
  component: TasksPage,
})

function TasksPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user: actor } = Route.useRouteContext()
  const canWrite = can(actor.role.name, 'tasks:write')
  const canFilterPeople = can(actor.role.name, 'users:read')

  const filters: TaskListFilters = {
    ...search,
    overdue: search.overdue === 'true' ? true : undefined,
    page: search.page ?? 1,
  }
  const tasks = useQuery(tasksQueryOptions(filters))
  const projects = useQuery(projectsQueryOptions({ pageSize: 100 }))
  const people = useQuery({
    ...usersQueryOptions({ status: 'active', pageSize: 100 }),
    enabled: canFilterPeople,
  })

  const columnCount = canWrite ? 7 : 6

  function setFilter(next: Partial<z.infer<typeof searchSchema>>) {
    navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.data
              ? `${tasks.data.total} ${tasks.data.total === 1 ? 'task' : 'tasks'}`
              : 'Work assigned on projects, with a status and a due date'}
          </p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="/tasks/new">Add task</Link>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SearchField value={search.q ?? ''} onChange={(q) => setFilter({ q: q || undefined })} />

        <FilterSelect
          label="Status"
          value={search.status ?? ANY}
          options={TASK_STATUSES.map((status) => ({
            value: status,
            label: status.replaceAll('_', ' '),
          }))}
          onChange={(value) =>
            setFilter({ status: value === ANY ? undefined : (value as TaskStatus) })
          }
        />

        <FilterSelect
          label="Priority"
          value={search.priority ?? ANY}
          options={PRIORITY_LEVELS.map((priority) => ({ value: priority, label: priority }))}
          onChange={(value) =>
            setFilter({ priority: value === ANY ? undefined : (value as PriorityLevel) })
          }
        />

        <FilterSelect
          label="Project"
          value={search.projectId ?? ANY}
          options={(projects.data?.items ?? []).map((project) => ({
            value: project.id,
            label: project.name,
          }))}
          onChange={(value) => setFilter({ projectId: value === ANY ? undefined : value })}
        />

        {canFilterPeople ? (
          <FilterSelect
            label="Assignee"
            value={search.assignedTo ?? ANY}
            options={(people.data?.items ?? []).map((person) => ({
              value: person.id,
              label: person.name,
            }))}
            onChange={(value) => setFilter({ assignedTo: value === ANY ? undefined : value })}
          />
        ) : null}

        <FilterSelect
          label="Due date"
          value={search.overdue ?? ANY}
          options={[{ value: 'true', label: 'Overdue' }]}
          onChange={(value) =>
            setFilter({ overdue: value === ANY ? undefined : (value as 'true') })
          }
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              {canWrite ? (
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.isPending ? <LoadingRows columns={columnCount} /> : null}

            {tasks.isError ? (
              <MessageRow colSpan={columnCount}>{describeError(tasks.error)}</MessageRow>
            ) : null}

            {tasks.data?.items.length === 0 ? (
              <MessageRow colSpan={columnCount}>
                {search.q ||
                search.status ||
                search.priority ||
                search.projectId ||
                search.assignedTo ||
                search.overdue
                  ? 'No tasks match these filters.'
                  : 'No tasks yet.'}
              </MessageRow>
            ) : null}

            {tasks.data?.items.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: task.project.id }}
                    className="hover:underline"
                  >
                    {task.project.name}
                  </Link>
                </TableCell>
                <TableCell>{task.assignee?.name ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  <DueDate value={task.dueDate} status={task.status} />
                </TableCell>
                {canWrite ? (
                  <TableCell>
                    <Link
                      to="/tasks/$taskId/edit"
                      params={{ taskId: task.id }}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {tasks.data && tasks.data.totalPages > 1 ? (
        <Pagination
          page={tasks.data.page}
          totalPages={tasks.data.totalPages}
          onChange={(page) => navigate({ search: (prev) => ({ ...prev, page }) })}
        />
      ) : null}
    </div>
  )
}

function DueDate({ value, status }: { value: string | null; status: TaskStatus }) {
  if (!value) {
    return '—'
  }

  const overdue = status !== 'completed' && value < utcToday()

  return <span className={overdue ? 'text-destructive' : undefined}>{value}</span>
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (draft === value) {
      return
    }

    const timer = setTimeout(() => onChange(draft), 300)

    return () => clearTimeout(timer)
  }, [draft, value, onChange])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="task-search">Search</Label>
      <Input
        id="task-search"
        type="search"
        placeholder="Title or description"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="capitalize">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function LoadingRows({ columns }: { columns: number }) {
  return Array.from({ length: 5 }, (_, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows
    <TableRow key={index}>
      {Array.from({ length: columns }, (_, cell) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder cells
        <TableCell key={cell}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

function MessageRow({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

function describeError(error: Error): string {
  if (error instanceof ApiRequestError && error.code === 'FORBIDDEN') {
    return 'You do not have permission to view tasks.'
  }

  return error.message
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
