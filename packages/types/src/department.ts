import { z } from 'zod'

/**
 * Departments are reference data: five rows seeded once, read constantly to
 * populate filters and labels. `GET /api/departments` returns all of them
 * unpaginated for that reason.
 */
export type DepartmentListItem = {
  id: string
  name: string
  description: string | null
  memberCount: number
}

/** Bounds mirror the `@db.VarChar` widths in packages/db/prisma/schema.prisma. */
const name = z
  .string()
  .trim()
  .min(1, 'Enter a name')
  .max(100, 'A name must be 100 characters or fewer')

/**
 * `description` is an unbounded TEXT column, but a description is a label
 * rather than a document, so the form caps it well below anything that would
 * break the table layout.
 */
const description = z
  .string()
  .trim()
  .max(500, 'A description must be 500 characters or fewer')
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()

export const createDepartmentSchema = z.object({ name, description })

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>

export const updateDepartmentSchema = z
  .object({ name, description })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  })

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
