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
