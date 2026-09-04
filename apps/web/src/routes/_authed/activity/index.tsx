import {
  ACTIVITY_ENTITY_TYPES,
  type ActivityEntityType,
  type ActivityListFilters,
} from '@opsflow/types/activity'
import { can } from '@opsflow/types/permissions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
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
import { activityQueryOptions } from '@/lib/activity'
import { ApiRequestError } from '@/lib/api'

const searchSchema = z.object({
  q: z.string().optional(),
  entityType: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

const ANY = 'any'

export const Route = createFileRoute('/_authed/activity/')({
  validateSearch: (search): z.infer<typeof searchSchema> => searchSchema.parse(search),
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'activity:read')) {
      throw redirect({ to: '/' })
    }
  },
  component: ActivityPage,
})

function ActivityPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user: actor } = Route.useRouteContext()

  const filters: ActivityListFilters = { ...search, page: search.page ?? 1 }
  const activity = useQuery(activityQueryOptions(filters))

  function setFilter(next: Partial<z.infer<typeof searchSchema>>) {
    navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          {activity.data
            ? `${activity.data.total} ${activity.data.total === 1 ? 'event' : 'events'}`
            : 'A trail of changes across the organisation'}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchField value={search.q ?? ''} onChange={(q) => setFilter({ q: q || undefined })} />

        <FilterSelect
          label="Entity"
          value={search.entityType ?? ANY}
          options={ACTIVITY_ENTITY_TYPES.map((type) => ({ value: type, label: type }))}
          onChange={(value) =>
            setFilter({ entityType: value === ANY ? undefined : (value as ActivityEntityType) })
          }
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {activity.isPending ? <LoadingRows columns={5} /> : null}

            {activity.isError ? (
              <MessageRow colSpan={5}>{describeError(activity.error)}</MessageRow>
            ) : null}

            {activity.data?.items.length === 0 ? (
              <MessageRow colSpan={5}>
                {search.q || search.entityType
                  ? 'No events match these filters.'
                  : 'No activity yet.'}
              </MessageRow>
            ) : null}

            {activity.data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatWhen(item.createdAt)}
                </TableCell>
                <TableCell>{item.actor?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {item.action.replaceAll('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <EntityLink type={item.entityType} id={item.entityId} role={actor.role.name} />
                </TableCell>
                <TableCell>{item.description ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {activity.data && activity.data.totalPages > 1 ? (
        <Pagination
          page={activity.data.page}
          totalPages={activity.data.totalPages}
          onChange={(page) => navigate({ search: (prev) => ({ ...prev, page }) })}
        />
      ) : null}
    </div>
  )
}

function EntityLink({
  type,
  id,
  role,
}: {
  type: ActivityEntityType
  id: string | null
  role: Parameters<typeof can>[0]
}) {
  const label = type

  if (!id) {
    return <span className="capitalize">{label}</span>
  }

  if (type === 'task') {
    return (
      <Link to="/tasks/$taskId" params={{ taskId: id }} className="capitalize hover:underline">
        {label}
      </Link>
    )
  }

  if (type === 'project') {
    return (
      <Link
        to="/projects/$projectId"
        params={{ projectId: id }}
        className="capitalize hover:underline"
      >
        {label}
      </Link>
    )
  }

  if (type === 'client' && can(role, 'clients:read')) {
    return (
      <Link
        to="/clients/$clientId"
        params={{ clientId: id }}
        className="capitalize hover:underline"
      >
        {label}
      </Link>
    )
  }

  if (type === 'user' && can(role, 'users:read')) {
    return (
      <Link to="/users/$userId" params={{ userId: id }} className="capitalize hover:underline">
        {label}
      </Link>
    )
  }

  return <span className="capitalize">{label}</span>
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString()
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
      <Label htmlFor="activity-search">Search</Label>
      <Input
        id="activity-search"
        type="search"
        placeholder="Description"
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
    return 'You do not have permission to view activity.'
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
