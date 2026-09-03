import { can } from '@opsflow/types/permissions'
import {
  PRIORITY_LEVELS,
  PROJECT_STATUSES,
  type PriorityLevel,
  type ProjectListFilters,
  type ProjectStatus,
} from '@opsflow/types/project'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ProgressBar } from '@/components/progress-bar'
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
import { clientsQueryOptions } from '@/lib/clients'
import { projectsQueryOptions } from '@/lib/projects'
import { usersQueryOptions } from '@/lib/users'

/**
 * Filters live in the URL rather than component state, so a filtered view can
 * be bookmarked, shared and restored by the back button.
 */
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  overdue: z.enum(['true']).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

/** Radix Select cannot hold an empty value, so "no filter" needs a sentinel. */
const ANY = 'any'

export const Route = createFileRoute('/_authed/projects/')({
  validateSearch: (search): z.infer<typeof searchSchema> => searchSchema.parse(search),
  component: ProjectsPage,
})

function ProjectsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user: actor } = Route.useRouteContext()
  const canWrite = can(actor.role.name, 'projects:write')
  const canFilterPeople = can(actor.role.name, 'users:read')
  const canFilterClients = can(actor.role.name, 'clients:read')

  const filters: ProjectListFilters = {
    ...search,
    overdue: search.overdue === 'true' ? true : undefined,
    page: search.page ?? 1,
  }
  const projects = useQuery(projectsQueryOptions(filters))
  const clients = useQuery({
    ...clientsQueryOptions({ pageSize: 100 }),
    enabled: canFilterClients,
  })
  const people = useQuery({
    ...usersQueryOptions({ status: 'active', pageSize: 100 }),
    enabled: canFilterPeople,
  })
  const managers = (people.data?.items ?? []).filter(
    (person) => person.role.name === 'admin' || person.role.name === 'manager',
  )

  const columnCount = canWrite ? 8 : 7

  function setFilter(next: Partial<z.infer<typeof searchSchema>>) {
    navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.data
              ? `${projects.data.total} ${projects.data.total === 1 ? 'project' : 'projects'}`
              : 'Work commissioned for clients, with a manager and a team'}
          </p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="/projects/new">Add project</Link>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SearchField value={search.q ?? ''} onChange={(q) => setFilter({ q: q || undefined })} />

        <FilterSelect
          label="Status"
          value={search.status ?? ANY}
          options={PROJECT_STATUSES.map((status) => ({
            value: status,
            label: status.replaceAll('_', ' '),
          }))}
          onChange={(value) =>
            setFilter({ status: value === ANY ? undefined : (value as ProjectStatus) })
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

        {canFilterClients ? (
          <FilterSelect
            label="Client"
            value={search.clientId ?? ANY}
            options={(clients.data?.items ?? []).map((client) => ({
              value: client.id,
              label: client.name,
            }))}
            onChange={(value) => setFilter({ clientId: value === ANY ? undefined : value })}
          />
        ) : null}

        {canFilterPeople ? (
          <FilterSelect
            label="Manager"
            value={search.managerId ?? ANY}
            options={managers.map((person) => ({ value: person.id, label: person.name }))}
            onChange={(value) => setFilter({ managerId: value === ANY ? undefined : value })}
          />
        ) : null}

        <FilterSelect
          label="Deadline"
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
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Deadline</TableHead>
              {canWrite ? (
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {projects.isPending ? <LoadingRows columns={columnCount} /> : null}

            {projects.isError ? (
              <MessageRow colSpan={columnCount}>{describeError(projects.error)}</MessageRow>
            ) : null}

            {projects.data?.items.length === 0 ? (
              <MessageRow colSpan={columnCount}>
                {search.q ||
                search.status ||
                search.priority ||
                search.clientId ||
                search.managerId ||
                search.overdue
                  ? 'No projects match these filters.'
                  : 'No projects yet.'}
              </MessageRow>
            ) : null}

            {projects.data?.items.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
                  </div>
                </TableCell>
                <TableCell>{project.client?.name ?? '—'}</TableCell>
                <TableCell>{project.manager?.name ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={project.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={project.priority} />
                </TableCell>
                <TableCell>
                  <ProgressBar value={project.progress} />
                </TableCell>
                <TableCell>{project.deadline ?? '—'}</TableCell>
                {canWrite ? (
                  <TableCell>
                    <Link
                      to="/projects/$projectId/edit"
                      params={{ projectId: project.id }}
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

      {projects.data && projects.data.totalPages > 1 ? (
        <Pagination
          page={projects.data.page}
          totalPages={projects.data.totalPages}
          onChange={(page) => navigate({ search: (prev) => ({ ...prev, page }) })}
        />
      ) : null}
    </div>
  )
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
      <Label htmlFor="project-search">Search</Label>
      <Input
        id="project-search"
        type="search"
        placeholder="Name or description"
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
    return 'You do not have permission to view projects.'
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
