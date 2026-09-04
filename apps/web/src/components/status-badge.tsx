import type { ClientStatus } from '@opsflow/types/client'
import type { PriorityLevel, ProjectStatus } from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import type { UserStatus } from '@opsflow/types/user'
import { Badge } from '@/components/ui/badge'

type DirectoryStatus = UserStatus | ClientStatus | ProjectStatus | TaskStatus

const STATUS_VARIANTS: Record<DirectoryStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
  archived: 'secondary',
  planning: 'secondary',
  on_hold: 'secondary',
  completed: 'default',
  delayed: 'destructive',
  cancelled: 'destructive',
  pending: 'secondary',
  in_progress: 'default',
  blocked: 'destructive',
}

const PRIORITY_VARIANTS: Record<PriorityLevel, 'default' | 'secondary' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  critical: 'destructive',
}

function labelFor(value: string) {
  return value.replaceAll('_', ' ')
}

export function StatusBadge({ status }: { status: DirectoryStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="capitalize">
      {labelFor(status)}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority]} className="capitalize">
      {priority}
    </Badge>
  )
}
