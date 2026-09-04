import type { DashboardStats } from '@opsflow/types/dashboard'
import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const dashboardKeys = {
  stats: ['dashboard', 'stats'] as const,
}

export const dashboardStatsQueryOptions = () =>
  queryOptions({
    queryKey: dashboardKeys.stats,
    queryFn: () => apiFetch<DashboardStats>('/dashboard'),
    // Same cadence as the unread badge: the dashboard is an operational
    // overview, so it should drift no further than the nav does.
    refetchInterval: 30_000,
  })
