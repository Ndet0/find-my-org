import type { ReactNode } from 'react'
import { describe } from '@/components/route-feedback'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { ApiRequestError } from '@/lib/api'

/** The one row a list table shows when it has nothing to list. */
export function MessageRow({ children, colSpan }: { children: ReactNode; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

/**
 * A list page's loader awaits the query, so a failed first load is the
 * router's error component. A failed refresh is different: Query keeps the
 * rows it already had and only sets `error`, so without this the page would
 * show stale rows and say nothing. Rendered above the table, so the rows
 * stay readable underneath.
 */
export function RefreshFailed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const status = error instanceof ApiRequestError ? error.status : undefined
  const { description } = describe(error, status)

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-tone-danger-foreground/30 bg-tone-danger px-4 py-2 text-sm text-tone-danger-foreground"
    >
      <span>Could not refresh this list. {description}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
