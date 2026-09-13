import { can, type Permission, type RoleName } from '@opsflow/types/permissions'
import {
  Activity,
  Bell,
  Building2,
  Contact,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  Users,
} from 'lucide-react'

export type NavItem = {
  to:
    | '/'
    | '/projects'
    | '/tasks'
    | '/users'
    | '/departments'
    | '/clients'
    | '/activity'
    | '/notifications'
  label: string
  icon: LucideIcon
  /** Omitted for destinations every signed-in user may reach. */
  permission?: Permission
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban, permission: 'projects:read' },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, permission: 'tasks:read' },
  { to: '/clients', label: 'Clients', icon: Contact, permission: 'clients:read' },
  { to: '/users', label: 'Team', icon: Users, permission: 'users:read' },
  { to: '/departments', label: 'Departments', icon: Building2, permission: 'departments:read' },
  { to: '/activity', label: 'Activity', icon: Activity, permission: 'activity:read' },
  { to: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications:read' },
]

/**
 * The navigation a role can reach. Filtering is a courtesy, not a security
 * control: the API rejects the request regardless, so a user who types a
 * forbidden path gets an error state rather than data. Kept apart from the
 * shell so it can be tested without rendering it.
 */
export function visibleNavItems(role: RoleName): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(role, item.permission))
}
