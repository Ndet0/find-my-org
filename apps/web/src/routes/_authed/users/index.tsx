import { ROLE_NAMES } from '@opsflow/types/permissions'
import { USER_STATUSES, type UserListFilters, type UserStatus } from '@opsflow/types/user'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { StatusBadge } from '@/components/status-badge'
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
import { departmentsQueryOptions, usersQueryOptions } from '@/lib/users'

/**
 * Filters live in the URL rather than component state, so a filtered view can
 * be bookmarked, shared and restored by the back button.
 */
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(ROLE_NAMES).optional(),
  departmentId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
})

/** Radix Select cannot hold an empty value, so "no filter" needs a sentinel. */
const ANY = 'any'

export const Route = createFileRoute('/_authed/users/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: UsersPage,
})

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const filters: UserListFilters = { ...search, page: search.page ?? 1 }
  const users = useQuery(usersQueryOptions(filters))
  const departments = useQuery(departmentsQueryOptions)

  function setFilter(next: Partial<UserListFilters>) {
    navigate({
      // Changing a filter resets to the first page: page 4 of the old result
      // set is rarely a meaningful place to land in the new one.
      search: (prev) => ({ ...prev, ...next, page: undefined }),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          {users.data
            ? `${users.data.total} ${users.data.total === 1 ? 'person' : 'people'}`
            : 'Everyone in the organisation'}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchField value={search.q ?? ''} onChange={(q) => setFilter({ q: q || undefined })} />

        <FilterSelect
          label="Role"
          value={search.role ?? ANY}
          options={ROLE_NAMES.map((role) => ({ value: role, label: role }))}
          onChange={(value) =>
            setFilter({ role: value === ANY ? undefined : (value as (typeof ROLE_NAMES)[number]) })
          }
        />

        <FilterSelect
          label="Status"
          value={search.status ?? ANY}
          options={USER_STATUSES.map((status) => ({ value: status, label: status }))}
          onChange={(value) =>
            setFilter({ status: value === ANY ? undefined : (value as UserStatus) })
          }
        />

        <FilterSelect
          label="Department"
          value={search.departmentId ?? ANY}
          options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
          onChange={(value) => setFilter({ departmentId: value === ANY ? undefined : value })}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.isPending ? <LoadingRows /> : null}

            {users.isError ? <MessageRow>{describeError(users.error)}</MessageRow> : null}

            {users.data?.items.length === 0 ? (
              <MessageRow>No one matches these filters.</MessageRow>
            ) : null}

            {users.data?.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link
                    to="/users/$userId"
                    params={{ userId: user.id }}
                    className="font-medium hover:underline"
                  >
                    {user.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell className="capitalize">{user.role.name}</TableCell>
                <TableCell>{user.department?.name ?? '—'}</TableCell>
                <TableCell>{user.position ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {users.data && users.data.totalPages > 1 ? (
        <Pagination
          page={users.data.page}
          totalPages={users.data.totalPages}
          onChange={(page) => navigate({ search: (prev) => ({ ...prev, page }) })}
        />
      ) : null}
    </div>
  )
}

/**
 * Typing writes to the URL, so it is debounced: one history entry and one
 * request per pause, rather than per keystroke.
 */
function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)

  // Re-sync when the URL changes from elsewhere, such as the back button.
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
      <Label htmlFor="user-search">Search</Label>
      <Input
        id="user-search"
        type="search"
        placeholder="Name or email"
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

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows
    <TableRow key={index}>
      {Array.from({ length: 5 }, (_, cell) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder cells
        <TableCell key={cell}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

function describeError(error: Error): string {
  // Navigation hides this page from employees, but the address bar does not,
  // so the server's refusal has to be explained rather than shown as a crash.
  if (error instanceof ApiRequestError && error.code === 'FORBIDDEN') {
    return 'You do not have permission to view the team directory.'
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
