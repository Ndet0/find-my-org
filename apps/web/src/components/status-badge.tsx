import type { UserStatus } from '@opsflow/types/user'
import { Badge } from '@/components/ui/badge'

const VARIANTS: Record<UserStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  )
}
