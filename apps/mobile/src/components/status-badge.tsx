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
import { Text, View } from 'react-native'

/**
 * Tone → classes stays here, spelled out, because Tailwind only scans this
 * app's sources: a class assembled from a string in `@opsflow/ui` would
 * never be generated. The tone tables themselves are shared with the web.
 */
const TONE_CLASSES: Record<Tone, { background: string; text: string }> = {
  muted: { background: 'bg-tone-muted', text: 'text-tone-muted-foreground' },
  neutral: { background: 'bg-tone-neutral', text: 'text-tone-neutral-foreground' },
  info: { background: 'bg-tone-info', text: 'text-tone-info-foreground' },
  success: { background: 'bg-tone-success', text: 'text-tone-success-foreground' },
  warning: { background: 'bg-tone-warning', text: 'text-tone-warning-foreground' },
  danger: { background: 'bg-tone-danger', text: 'text-tone-danger-foreground' },
}

/** The shared pill. Exported for labels that are not a status, like an activity action. */
export function Badge({ tone, label }: { tone: Tone; label: string }) {
  const classes = TONE_CLASSES[tone]

  return (
    <View className={`rounded-full px-2 py-0.5 ${classes.background}`}>
      <Text className={`text-xs font-medium ${classes.text}`}>{label}</Text>
    </View>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={TASK_STATUS_TONES[status]} label={toneLabel(status)} />
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={PROJECT_STATUS_TONES[status]} label={toneLabel(status)} />
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge tone={CLIENT_STATUS_TONES[status]} label={toneLabel(status)} />
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={USER_STATUS_TONES[status]} label={toneLabel(status)} />
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return <Badge tone={PRIORITY_TONES[priority]} label={toneLabel(priority)} />
}

export function taskStatusLabel(status: TaskStatus): string {
  return toneLabel(status)
}

export function projectStatusLabel(status: ProjectStatus): string {
  return toneLabel(status)
}

export function clientStatusLabel(status: ClientStatus): string {
  return toneLabel(status)
}

export function userStatusLabel(status: UserStatus): string {
  return toneLabel(status)
}
