import type { ProjectListItem } from '@opsflow/types/project'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { PressableCard } from '@/components/card'
import { ListFooter } from '@/components/list-footer'
import { describeError, Message } from '@/components/message'
import { ProgressBar } from '@/components/progress-bar'
import { Screen } from '@/components/screen'
import { PriorityBadge, ProjectStatusBadge } from '@/components/status-badge'
import { useCan, useCurrentUser } from '@/lib/current-user'
import { isProjectOverdue } from '@/lib/dates'
import { flattenPages, loadMore, pagedCountLabel, pagedTotal } from '@/lib/paged'
import { projectsInfiniteQueryOptions } from '@/lib/projects'

/**
 * Every project the caller may see, ordered by name on the server. The API
 * already narrows an employee to the projects they manage or belong to.
 * A page at a time, the next loading as the list reaches its end; the
 * filtered table stays on the web. Roles with `projects:write` add
 * projects from here and manage them from the project screen.
 */
export default function ProjectsScreen() {
  const user = useCurrentUser()
  const router = useRouter()
  const canWrite = useCan('projects:write')
  const projects = useInfiniteQuery(projectsInfiniteQueryOptions())
  const items = flattenPages(projects.data)

  if (!user) {
    return null
  }

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3 py-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Projects
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {pagedCountLabel(items.length, pagedTotal(projects.data), 'project', 'projects') ??
              (user.role.name === 'employee'
                ? 'Projects you manage or belong to'
                : 'Every project in the workspace')}
          </Text>
        </View>
        {canWrite ? (
          <Button title="Add" size="sm" onPress={() => router.push('/projects/new')} />
        ) : null}
      </View>

      {projects.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : projects.isError && items.length === 0 ? (
        <Message
          title="Projects could not be loaded"
          body={describeError(projects.error)}
          onRetry={() => projects.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(project) => project.id}
          renderItem={({ item }) => <ProjectRow project={item} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          onEndReached={loadMore(projects)}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            <ListFooter
              loading={projects.isFetchingNextPage}
              failed={projects.isFetchNextPageError}
            />
          }
          ListEmptyComponent={
            <Message
              title="No projects yet"
              body={
                canWrite
                  ? 'Add one with the button above.'
                  : 'Projects you are added to will appear here.'
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={projects.isRefetching}
              onRefresh={() => projects.refetch()}
            />
          }
        />
      )}
    </Screen>
  )
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  const overdue = isProjectOverdue(project.deadline, project.status)

  return (
    <Link href={{ pathname: '/projects/[projectId]', params: { projectId: project.id } }} asChild>
      <PressableCard className="gap-2">
        <Text
          className="text-base font-medium text-neutral-900 dark:text-neutral-50"
          numberOfLines={2}
        >
          {project.name}
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {project.client?.name ?? 'No client'}
          {project.manager ? ` · ${project.manager.name}` : ''}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
          {project.deadline ? (
            <Text
              className={`text-xs ${overdue ? 'text-tone-danger-foreground' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              {overdue ? `Overdue · ${project.deadline}` : `Due ${project.deadline}`}
            </Text>
          ) : null}
        </View>
        <ProgressBar value={project.progress} />
      </PressableCard>
    </Link>
  )
}
