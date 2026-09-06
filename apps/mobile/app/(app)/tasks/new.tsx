import { useLocalSearchParams } from 'expo-router'
import { TaskForm } from '@/forms/task-form'

/** `?projectId=` preselects the project when arriving from its screen. */
export default function NewTaskScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>()

  return <TaskForm defaultProjectId={projectId} />
}
