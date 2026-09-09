import { Stack } from 'expo-router'

/**
 * Everything behind the sign-in guard. The tabs are the home; record and
 * form screens push on top of them so the tab bar stays out of the way.
 * Clients, departments, people and activity have no tab — they are reached
 * from the dashboard counts and the profile tab's directory, by the roles
 * that may read them.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tasks/[taskId]/index" options={{ headerShown: true, title: 'Task' }} />
      <Stack.Screen
        name="tasks/[taskId]/edit"
        options={{ headerShown: true, title: 'Edit task' }}
      />
      <Stack.Screen name="tasks/new" options={{ headerShown: true, title: 'New task' }} />
      <Stack.Screen
        name="projects/[projectId]/index"
        options={{ headerShown: true, title: 'Project' }}
      />
      <Stack.Screen
        name="projects/[projectId]/edit"
        options={{ headerShown: true, title: 'Edit project' }}
      />
      <Stack.Screen name="projects/new" options={{ headerShown: true, title: 'New project' }} />
      <Stack.Screen name="clients/index" options={{ headerShown: true, title: 'Clients' }} />
      <Stack.Screen
        name="clients/[clientId]/index"
        options={{ headerShown: true, title: 'Client' }}
      />
      <Stack.Screen
        name="clients/[clientId]/edit"
        options={{ headerShown: true, title: 'Edit client' }}
      />
      <Stack.Screen name="clients/new" options={{ headerShown: true, title: 'New client' }} />
      <Stack.Screen
        name="departments/index"
        options={{ headerShown: true, title: 'Departments' }}
      />
      <Stack.Screen name="users/index" options={{ headerShown: true, title: 'People' }} />
      <Stack.Screen name="users/[userId]/index" options={{ headerShown: true, title: 'Person' }} />
      <Stack.Screen
        name="users/[userId]/edit"
        options={{ headerShown: true, title: 'Edit person' }}
      />
      <Stack.Screen name="users/new" options={{ headerShown: true, title: 'New person' }} />
      <Stack.Screen name="activity/index" options={{ headerShown: true, title: 'Activity' }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Edit profile' }} />
      <Stack.Screen
        name="profile/password"
        options={{ headerShown: true, title: 'Change password' }}
      />
    </Stack>
  )
}
