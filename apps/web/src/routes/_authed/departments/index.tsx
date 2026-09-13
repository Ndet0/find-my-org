import { createDepartmentSchema, type DepartmentListItem } from '@opsflow/types/department'
import { can } from '@opsflow/types/permissions'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FieldMessage } from '@/components/field-message'
import { ListPending } from '@/components/route-feedback'
import { MessageRow, RefreshFailed } from '@/components/table-message'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ApiRequestError, type FieldErrorMap, fieldErrorsFrom, formErrorMessage } from '@/lib/api'
import {
  createDepartment,
  deleteDepartment,
  departmentKeys,
  departmentsQueryOptions,
  updateDepartment,
} from '@/lib/departments'
import { userKeys } from '@/lib/users'

export const Route = createFileRoute('/_authed/departments/')({
  beforeLoad: ({ context }) => {
    if (!can(context.user.role.name, 'departments:read')) {
      throw redirect({ to: '/' })
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(departmentsQueryOptions),
  pendingComponent: ListPending,
  component: DepartmentsPage,
})

function DepartmentsPage() {
  const { user } = Route.useRouteContext()
  const canWrite = can(user.role.name, 'departments:write')
  const departments = useSuspenseQuery(departmentsQueryOptions)
  const [editing, setEditing] = useState<DepartmentListItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DepartmentListItem | null>(null)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {`${departments.data.length} ${departments.data.length === 1 ? 'department' : 'departments'}`}
          </p>
        </div>
        {canWrite ? <Button onClick={() => setEditing('new')}>Add department</Button> : null}
      </header>

      {departments.isError ? (
        <RefreshFailed error={departments.error} onRetry={() => void departments.refetch()} />
      ) : null}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              {canWrite ? (
                <TableHead className="w-40">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.data.length === 0 ? (
              <MessageRow colSpan={canWrite ? 4 : 3}>No departments yet.</MessageRow>
            ) : null}

            {departments.data.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">{department.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {department.description ?? '—'}
                </TableCell>
                <TableCell>
                  <Link
                    to="/users"
                    search={{ departmentId: department.id }}
                    className="hover:underline"
                  >
                    {department.memberCount}
                  </Link>
                </TableCell>
                {canWrite ? (
                  <TableCell>
                    <div className="flex gap-3">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(department)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-destructive"
                        onClick={() => setDeleting(department)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DepartmentFormDialog
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        department={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />

      <DeleteDepartmentDialog department={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}

function DepartmentFormDialog({
  department,
  open,
  onClose,
}: {
  department?: DepartmentListItem
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [serverErrors, setServerErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = department !== undefined

  const mutation = useMutation({
    mutationFn: (values: { name: string; description: string }) => {
      const payload = createDepartmentSchema.parse(values)
      return isEdit ? updateDepartment(department.id, payload) : createDepartment(payload)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })
      toast.success(isEdit ? `${saved.name} was updated` : `${saved.name} was added`)
      onClose()
    },
    onError: (error) => {
      setServerErrors(fieldErrorsFrom(error))
      setFormError(formErrorMessage(error, 'The department could not be saved'))
    },
  })

  const form = useForm({
    defaultValues: {
      name: department?.name ?? '',
      description: department?.description ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerErrors({})
      setFormError(null)
      // `onError` owns the failure; without the catch it is also an unhandled rejection.
      await mutation.mutateAsync(value).catch(() => undefined)
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit department' : 'Add department'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Renaming a department updates it everywhere it is shown.'
              : 'A department is a label on people, not a permission boundary.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldMessage errors={field.state.meta.errors} server={serverErrors.name?.[0]} />
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  rows={3}
                />
                <FieldMessage
                  errors={field.state.meta.errors}
                  server={serverErrors.description?.[0]}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDepartmentDialog({
  department,
  onClose,
}: {
  department: DepartmentListItem | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: async (deleted) => {
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success(`${deleted.name} was deleted`)
      onClose()
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'The department could not be deleted',
      )
    },
  })

  return (
    <AlertDialog open={department !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {department?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {department && department.memberCount > 0
              ? `This department still has ${department.memberCount} ${department.memberCount === 1 ? 'member' : 'members'}. Reassign them first.`
              : 'This cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!department || department.memberCount > 0 || mutation.isPending}
            onClick={(event) => {
              event.preventDefault()
              if (department && department.memberCount === 0) {
                mutation.mutate(department.id)
              }
            }}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
