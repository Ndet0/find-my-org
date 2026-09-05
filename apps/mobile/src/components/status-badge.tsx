import type { PriorityLevel } from '@opsflow/types/project'
import type { TaskStatus } from '@opsflow/types/task'
import { Text, View } from 'react-native'

const STATUS: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-neutral-200 text-neutral-800' },
  in_progress: { label: 'In progress', className: 'bg-blue-100 text-blue-800' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
}

const PRIORITY: Record<PriorityLevel, string> = {
  low: 'bg-neutral-100 text-neutral-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

function Badge({ label, className }: { label: string; className: string }) {
  const [background, text] = className.split(' ')

  return (
    <View className={`rounded-full px-2 py-0.5 ${background}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge {...STATUS[status]} />
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return <Badge label={priority} className={PRIORITY[priority]} />
}

export function taskStatusLabel(status: TaskStatus): string {
  return STATUS[status].label
}
