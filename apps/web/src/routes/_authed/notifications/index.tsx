import type { NotificationListFilters } from '@opsflow/types/notification'
import { can } from '@opsflow/types/permissions'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ListPending } from '@/components/route-feedback'
import { MessageRow, RefreshFailed } from '@/components/table-message'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  notificationsQueryOptions,
} from '@/lib/notifications'

const searchSchema = z.object({
  q: z.string().optional(),
  unread: z.enum(['true']).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

const ANY = 'any'

/** One place turns URL search into list filters, for the loader and the page alike. */
function filtersFrom(search: z.infer<typeof searchSchema>): NotificationListFilters {
  return {
    ...search,
    unread: search.unread === 'true' ? true : undefined,
    page: search.page ?? 1,
  }
}

export const Route = createFileRoute('/_authed/notifications/')({
  validateSearch: (search): z.infer<typeof searchSchema> => searchSchema.parse(search),
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'notifications:read')) {
      throw redirect({ to: '/' })
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(notificationsQueryOptions(filtersFrom(deps))),
  pendingComponent: ListPending,
  component: NotificationsPage,
})

function NotificationsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const filters = filtersFrom(search)
  const notifications = useSuspenseQuery(notificationsQueryOptions(filters))

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  }

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  })

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  })

  function setFilter(next: Partial<z.infer<typeof searchSchema>>) {
    navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {`${notifications.data.total} ${notifications.data.total === 1 ? 'notification' : 'notifications'}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          {markAll.isPending ? 'Marking…' : 'Mark all as read'}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchField value={search.q ?? ''} onChange={(q) => setFilter({ q: q || undefined })} />

        <FilterSelect
          label="Status"
          value={search.unread ?? ANY}
          options={[{ value: 'true', label: 'Unread' }]}
          onChange={(value) => setFilter({ unread: value === ANY ? undefined : (value as 'true') })}
        />
      </div>

      {notifications.isError ? (
        <RefreshFailed error={notifications.error} onRetry={() => void notifications.refetch()} />
      ) : null}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notification</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="w-32">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {notifications.data.items.length === 0 ? (
              <MessageRow colSpan={4}>
                {search.q || search.unread
                  ? 'No notifications match these filters.'
                  : 'No notifications yet.'}
              </MessageRow>
            ) : null}

            {notifications.data.items.map((item) => (
              <TableRow key={item.id} className={item.isRead ? undefined : 'bg-muted/40'}>
                <TableCell>
                  <p className={item.isRead ? 'font-medium' : 'font-semibold'}>{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatWhen(item.createdAt)}
                </TableCell>
                <TableCell>
                  {item.isRead ? (
                    <span className="text-sm text-muted-foreground">Read</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markOne.mutate(item.id)}
                      disabled={markOne.isPending}
                    >
                      Mark as read
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {notifications.data.totalPages > 1 ? (
        <Pagination
          page={notifications.data.page}
          totalPages={notifications.data.totalPages}
          onChange={(page) => navigate({ search: (prev) => ({ ...prev, page }) })}
        />
      ) : null}
    </div>
  )
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
      <Label htmlFor="notification-search">Search</Label>
      <Input
        id="notification-search"
        type="search"
        placeholder="Title or message"
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
