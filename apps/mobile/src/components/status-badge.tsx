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
 * The web recolours its tone variables under `.dark`; NativeWind has no
 * cascade to override a variable with, so here the dark pair is a class.
 */
const TONE_CLASSES: Record<Tone, { background: string; text: string }> = {
  muted: {
    background: 'bg-tone-muted dark:bg-tone-muted-dark',
    text: 'text-tone-muted-foreground dark:text-tone-muted-dark-foreground',
  },
  neutral: {
    background: 'bg-tone-neutral dark:bg-tone-neutral-dark',
    text: 'text-tone-neutral-foreground dark:text-tone-neutral-dark-foreground',
  },
  info: {
    background: 'bg-tone-info dark:bg-tone-info-dark',
    text: 'text-tone-info-foreground dark:text-tone-info-dark-foreground',
  },
  success: {
    background: 'bg-tone-success dark:bg-tone-success-dark',
    text: 'text-tone-success-foreground dark:text-tone-success-dark-foreground',
  },
  warning: {
    background: 'bg-tone-warning dark:bg-tone-warning-dark',
    text: 'text-tone-warning-foreground dark:text-tone-warning-dark-foreground',
  },
  danger: {
    background: 'bg-tone-danger dark:bg-tone-danger-dark',
    text: 'text-tone-danger-foreground dark:text-tone-danger-dark-foreground',
  },
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
