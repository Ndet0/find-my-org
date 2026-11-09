import type { ClientStatus } from '@opsflow/types/client'
import type { PriorityLevel, ProjectStatus } from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import type { UserStatus } from '@opsflow/types/user'
import {
  CLIENT_STATUS_TONES,
  PROJECT_STATUS_TONES,
  TASK_STATUS_TONES,
  type Tone,
  toneLabel,
  USER_STATUS_TONES,
} from '@opsflow/ui/tones'
import { cn } from '@/lib/utils'

type DirectoryStatus = UserStatus | ClientStatus | ProjectStatus | TaskStatus

const STATUS_TONES: Record<DirectoryStatus, Tone> = {
  ...USER_STATUS_TONES,
  ...CLIENT_STATUS_TONES,
  ...PROJECT_STATUS_TONES,
  ...TASK_STATUS_TONES,
}

const GLYPH: Record<Tone, 'backlog' | 'todo' | 'progress' | 'done' | 'hold' | 'blocked'> = {
  muted: 'backlog',
  neutral: 'todo',
  info: 'progress',
  success: 'done',
  warning: 'hold',
  danger: 'blocked',
}

const GLYPH_CLASS: Record<Tone, string> = {
  muted: 'text-muted-foreground',
  neutral: 'text-muted-foreground',
  info: 'text-amber-500',
  success: 'text-primary',
  warning: 'text-amber-600',
  danger: 'text-destructive',
}

/**
 * Circular status marks in the style of an issue tracker: outline for todo,
 * a filled wedge for in progress, a check for done, and a cross for cancelled.
 * The short label stays so the meaning is not carried by colour alone.
 */
export function StatusBadge({ status }: { status: DirectoryStatus }) {
  const tone = STATUS_TONES[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
      <StatusGlyph kind={GLYPH[tone]} className={GLYPH_CLASS[tone]} />
      <span>{toneLabel(status)}</span>
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
      <PriorityBars priority={priority} />
      <span>{toneLabel(priority)}</span>
    </span>
  )
}

function StatusGlyph({ kind, className }: { kind: (typeof GLYPH)[Tone]; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('size-3.5 shrink-0', className)}>
      {kind === 'backlog' ? (
        <circle
          cx="8"
          cy="8"
          r="5.25"
          fill="none"
          stroke="currentColor"
          strokeDasharray="2.2 1.8"
        />
      ) : null}
      {kind === 'todo' ? (
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      ) : null}
      {kind === 'progress' ? (
        <>
          <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 2.75a5.25 5.25 0 0 1 0 10.5z" fill="currentColor" />
        </>
      ) : null}
      {kind === 'done' ? (
        <>
          <circle cx="8" cy="8" r="6" fill="currentColor" />
          <path
            d="M5 8.2 7 10.1 11 6"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {kind === 'hold' ? (
        <>
          <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6.2 6v4M9.8 6v4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'blocked' ? (
        <>
          <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5.2 5.2 10.8 10.8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  )
}

const LEVEL: Record<PriorityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function PriorityBars({ priority }: { priority: PriorityLevel }) {
  const filled = LEVEL[priority]
  return (
    <span aria-hidden className="inline-flex items-end gap-px">
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            'w-0.5 rounded-sm',
            bar <= filled
              ? priority === 'critical'
                ? 'bg-destructive'
                : priority === 'high'
                  ? 'bg-amber-500'
                  : 'bg-muted-foreground'
              : 'bg-border',
          )}
          style={{ height: `${4 + bar * 2}px` }}
        />
      ))}
    </span>
  )
}
