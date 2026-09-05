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
    // Same cadence as the unread badge and as the web dashboard: an
    // operational overview should drift no further than the tab bar does.
    refetchInterval: 30_000,
  })
