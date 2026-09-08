import type { ClientStatus } from '@opsflow/types/client'
import type { PriorityLevel, ProjectStatus } from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import type { UserStatus } from '@opsflow/types/user'
import type { Tone } from './colors'

export type { Tone }

/**
 * Which tone each status and priority renders in. This is the table the
 * web and mobile badges both read, so a status looks the same on a desk
 * and on a phone. Only the tone is shared: Tailwind sees class names only
 * in each app's own sources, so each client keeps its own `Tone → classes`
 * map and never builds a class from a string.
 */
export const TASK_STATUS_TONES: Record<TaskStatus, Tone> = {
  pending: 'neutral',
  in_progress: 'info',
  blocked: 'danger',
  completed: 'success',
}

export const PROJECT_STATUS_TONES: Record<ProjectStatus, Tone> = {
  planning: 'neutral',
  active: 'info',
  on_hold: 'warning',
  completed: 'success',
  delayed: 'danger',
  cancelled: 'muted',
}

export const CLIENT_STATUS_TONES: Record<ClientStatus, Tone> = {
  active: 'success',
  inactive: 'warning',
  archived: 'muted',
}

export const USER_STATUS_TONES: Record<UserStatus, Tone> = {
  active: 'success',
  inactive: 'warning',
  suspended: 'danger',
}

export const PRIORITY_TONES: Record<PriorityLevel, Tone> = {
  low: 'muted',
  medium: 'neutral',
  high: 'warning',
  critical: 'danger',
}

/** `in_progress` → "In progress": the badge text for any status or priority value. */
export function toneLabel(value: string): string {
  const words = value.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
