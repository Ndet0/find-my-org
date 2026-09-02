import type { ClientStatus } from '@opsflow/types/client'
import type { UserStatus } from '@opsflow/types/user'
import { Badge } from '@/components/ui/badge'

type DirectoryStatus = UserStatus | ClientStatus

const VARIANTS: Record<DirectoryStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
  archived: 'secondary',
}

export function StatusBadge({ status }: { status: DirectoryStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  )
}
