/**
 * Dashboard statistics, computed server-side per docs/technical_architecture.md
 * §24 — the client receives counts, never the datasets behind them.
 *
 * `projects` and `tasks` are row-scoped with the same visibility rules as the
 * list endpoints, so for an employee they are "my" counts. There is no request
 * query and therefore no Zod schema in this module: `GET /api/dashboard` takes
 * no parameters — the caller's role decides the shape of the answer.
 */

export type DashboardProjectStats = {
  total: number
  active: number
  completed: number
  delayed: number
  /** deadline < today AND status not in [completed, cancelled] */
  overdue: number
}

export type DashboardTaskStats = {
  total: number
  pending: number
  inProgress: number
  completed: number
  /** dueDate < today AND status != completed */
  overdue: number
}

export type DashboardOrgStats = {
  users: { total: number; active: number }
  /** Users holding the `employee` role. */
  employees: { total: number }
  departments: { total: number }
  clients: { total: number; active: number }
}

/** `org` is null for employees — the API never sends org-wide metrics to them. */
export type DashboardStats = {
  projects: DashboardProjectStats
  tasks: DashboardTaskStats
  org: DashboardOrgStats | null
}
