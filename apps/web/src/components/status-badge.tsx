import type { ClientStatus } from '@opsflow/types/client'
import type { PriorityLevel, ProjectStatus } from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import type { UserStatus } from '@opsflow/types/user'
import {
  CLIENT_STATUS_TONES,
  PRIORITY_TONES,
  PROJECT_STATUS_TONES,
  TASK_STATUS_TONES,
  type Tone,
  toneLabel,
  USER_STATUS_TONES,
} from '@opsflow/ui/tones'
import { Badge } from '@/components/ui/badge'

type DirectoryStatus = UserStatus | ClientStatus | ProjectStatus | TaskStatus

/**
 * Tone → classes stays here, spelled out, because Tailwind only scans this
 * app's sources: a class assembled from a string in `@opsflow/ui` would
 * never be generated. The tone tables themselves are shared with mobile.
 */
const TONE_CLASSES: Record<Tone, string> = {
  muted: 'bg-tone-muted text-tone-muted-foreground',
  neutral: 'bg-tone-neutral text-tone-neutral-foreground',
  info: 'bg-tone-info text-tone-info-foreground',
  success: 'bg-tone-success text-tone-success-foreground',
  warning: 'bg-tone-warning text-tone-warning-foreground',
  danger: 'bg-tone-danger text-tone-danger-foreground',
}

// The status unions overlap (`active`, `completed`, `inactive`), and the
// tone tables agree wherever they do, so one lookup can serve all four.
const STATUS_TONES: Record<DirectoryStatus, Tone> = {
  ...USER_STATUS_TONES,
  ...CLIENT_STATUS_TONES,
  ...PROJECT_STATUS_TONES,
  ...TASK_STATUS_TONES,
}

function ToneBadge({ tone, children }: { tone: Tone; children: string }) {
  // `ghost` sets no colour of its own, so the tone classes are the only ones.
  return (
    <Badge variant="ghost" className={TONE_CLASSES[tone]}>
      {children}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: DirectoryStatus }) {
  return <ToneBadge tone={STATUS_TONES[status]}>{toneLabel(status)}</ToneBadge>
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return <ToneBadge tone={PRIORITY_TONES[priority]}>{toneLabel(priority)}</ToneBadge>
}
