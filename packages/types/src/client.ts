import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './api'

/**
 * Mirrors the `client_status` enum in packages/db/prisma/schema.prisma.
 * Restated rather than imported: `@opsflow/db` instantiates the Prisma
 * client on import and must never reach a client bundle.
 */
export const CLIENT_STATUSES = ['active', 'inactive', 'archived'] as const

export type ClientStatus = (typeof CLIENT_STATUSES)[number]

/** One row of `GET /api/clients`. Trimmed to what the directory table renders. */
export type ClientListItem = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: ClientStatus
  projectCount: number
}

/** The body of `GET /api/clients/:id`. */
export type ClientDetail = ClientListItem & {
  address: string | null
  notes: string | null
  createdAt: string
}

/**
 * Query parameters for `GET /api/clients`, shared so the web app builds the
 * query string against the same schema the API validates it with.
 *
 * Everything is optional: an unfiltered first page is a valid request. Empty
 * strings are coerced away because a cleared filter control submits `''`,
 * which should mean "no filter" rather than "match the empty string".
 */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

export const clientListQuerySchema = z.object({
  q: optionalText,
  status: z.enum(CLIENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type ClientListQuery = z.infer<typeof clientListQuerySchema>

/** The caller-facing form of the query, before defaults are applied. */
export type ClientListFilters = Partial<Omit<ClientListQuery, 'page' | 'pageSize'>> & {
  page?: number
  pageSize?: number
}

/**
 * An optional text column. A cleared input submits `''`, which means "no
 * value" rather than "the empty string", so it becomes `null`. On a PATCH
 * that gives the two states apart: `undefined` leaves the column alone,
 * `null` clears it.
 */
const optionalField = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()

/** Bounds mirror the `@db.VarChar` widths in packages/db/prisma/schema.prisma. */
const name = z
  .string()
  .trim()
  .min(1, 'Enter a name')
  .max(150, 'A name must be 150 characters or fewer')

const company = optionalField(200, 'A company name')
const phone = optionalField(30, 'A phone number')

/**
 * Email is optional on a client. Empty becomes null; a value is lowercased
 * to match how users are stored, then checked as an address.
 */
const email = z
  .string()
  .trim()
  .max(255, 'An email must be 255 characters or fewer')
  .transform((value) => (value === '' ? null : value.toLowerCase()))
  .pipe(z.union([z.null(), z.email('Enter a valid email address')]))
  .nullable()
  .optional()

/**
 * Address and notes are unbounded TEXT columns. The form caps them so a
 * paste cannot dump a document into a table cell.
 */
const address = optionalField(2000, 'An address')
const notes = optionalField(2000, 'Notes')

/**
 * The body of `POST /api/clients`.
 *
 * Status is not here: a new client is always `active`. Changing status is a
 * distinct action with its own confirmation rather than a field on the form.
 */
export const createClientSchema = z.object({
  name,
  company,
  email,
  phone,
  address,
  notes,
})

export type CreateClientInput = z.infer<typeof createClientSchema>

/**
 * The body of `PATCH /api/clients/:id`.
 *
 * Status is not here: archiving or deactivating is a distinct action with
 * its own confirmation, matching the user-status endpoint.
 */
export const updateClientSchema = z
  .object({
    name,
    company,
    email,
    phone,
    address,
    notes,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  })

export type UpdateClientInput = z.infer<typeof updateClientSchema>

/** The body of `PATCH /api/clients/:id/status`. */
export const updateClientStatusSchema = z.object({
  status: z.enum(CLIENT_STATUSES),
})

export type UpdateClientStatusInput = z.infer<typeof updateClientStatusSchema>
