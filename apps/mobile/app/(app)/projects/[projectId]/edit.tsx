import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { describeError, Message } from '@/components/message'
import { ProjectForm } from '@/forms/project-form'
import { projectQueryOptions } from '@/lib/projects'

export default function EditProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const project = useQuery(projectQueryOptions(projectId))

  if (project.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-100">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (project.isError) {
    return (
      <View className="flex-1 bg-neutral-100 px-4">
        <Message
          title="Project unavailable"
          body={describeError(project.error)}
          onRetry={() => project.refetch()}
        />
      </View>
    )
  }

  return <ProjectForm project={project.data} />
}
