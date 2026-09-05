import { Stack } from 'expo-router'

/**
 * Everything behind the sign-in guard. The tabs are the home; record
 * screens push on top of them so the tab bar stays out of the way.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tasks/[taskId]" options={{ headerShown: true, title: 'Task' }} />
      <Stack.Screen name="projects/[projectId]" options={{ headerShown: true, title: 'Project' }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Edit profile' }} />
    </Stack>
  )
}
