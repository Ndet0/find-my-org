import { Ionicons } from '@expo/vector-icons'
import { colors } from '@opsflow/ui/colors'
import { useQuery } from '@tanstack/react-query'
import { Tabs } from 'expo-router'
import { unreadCountQueryOptions } from '@/lib/notifications'

/**
 * The five mobile priorities from product §30 — dashboard, tasks, projects,
 * notifications, profile — as tabs. The inbox badge is the same polled
 * count the web nav shows; it disappears at zero rather than showing "0".
 */
export default function TabsLayout() {
  const unread = useQuery(unreadCountQueryOptions())
  const badge = unread.data && unread.data.count > 0 ? unread.data.count : undefined

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.neutral[900] }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'My tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Inbox',
          tabBarBadge: badge,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
