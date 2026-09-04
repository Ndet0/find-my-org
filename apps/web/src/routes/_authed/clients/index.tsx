import { CLIENT_STATUSES, type ClientListFilters, type ClientStatus } from '@opsflow/types/client'
import { can } from '@opsflow/types/permissions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientsQueryOptions } from '@/lib/clients'

/**
 * Filters live in the URL rather than component state, so a filtered view can
 * be bookmarked, shared and restored by the back button.
 */
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

/** Radix Select cannot hold an empty value, so "no filter" needs a sentinel. */
const ANY = 'any'

/** One place turns URL search into list filters, for the loader and the page alike. */
function filtersFrom(search: z.infer<typeof searchSchema>): ClientListFilters {
  return { ...search, page: search.page ?? 1 }
}

export const Route = createFileRoute('/_authed/clients/')({
  validateSearch: (search): z.infer<typeof searchSchema> => searchSchema.parse(search),
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'clients:read')) {
      throw redirect({ to: '/' })
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(clientsQueryOptions(filtersFrom(deps))),
  component: ClientsPage,
})

function ClientsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user: actor } = Route.useRouteContext()
  const canWrite = can(actor.role.name, 'clients:write')

  const filters = filtersFrom(search)
  const clients = useSuspenseQuery(clientsQueryOptions(filters))

  function setFilter(next: Partial<ClientListFilters>) {
    navigate({
      // Changing a filter resets to the first page: page 4 of the old result
      // set is rarely a meaningful place to land in the new one.
      search: (prev) => ({ ...prev, ...next, page: undefined }),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {`${clients.data.total} ${clients.data.total === 1 ? 'client' : 'clients'}`}
          </p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="/clients/new">Add client</Link>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SearchField value={search.q ?? ''} onChange={(q) => setFilter({ q: q || undefined })} />

        <FilterSelect
          label="Status"
          value={search.status ?? ANY}
          options={CLIENT_STATUSES.map((status) => ({ value: status, label: status }))}
          onChange={(value) =>
            setFilter({ status: value === ANY ? undefined : (value as ClientStatus) })
          }
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Status</TableHead>
              {canWrite ? (
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {clients.data.items.length === 0 ? (
              <MessageRow colSpan={canWrite ? 6 : 5}>
                {search.q || search.status ? 'No clients match these filters.' : 'No clients yet.'}
              </MessageRow>
            ) : null}

            {clients.data.items.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: client.id }}
                    className="font-medium hover:underline"
                  >
                    {client.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{client.email ?? 'No email'}</div>
                </TableCell>
                <TableCell>{client.company ?? '—'}</TableCell>
                <TableCell>{client.phone ?? '—'}</TableCell>
                <TableCell>{client.projectCount}</TableCell>
                <TableCell>
                  <StatusBadge status={client.status} />
                </TableCell>
                {canWrite ? (
                  <TableCell>
                    <Link
                      to="/clients/$clientId/edit"
                      params={{ clientId: client.id }}
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

      {clients.data.totalPages > 1 ? (
        <Pagination
          page={clients.data.page}
          totalPages={clients.data.totalPages}
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
      <Label htmlFor="client-search">Search</Label>
      <Input
        id="client-search"
        type="search"
        placeholder="Name, company or email"
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

function MessageRow({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
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
