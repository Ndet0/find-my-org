import { can, type Permission } from '@opsflow/types/permissions'
import type { CurrentUser } from '@opsflow/types/user'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Activity,
  Bell,
  Building2,
  Contact,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  type LucideIcon,
  UserRound,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { unreadCountQueryOptions } from '@/lib/notifications'
import { cn } from '@/lib/utils'

type NavItem = {
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
 * The frame around every authenticated page: navigation filtered to what the
 * caller's role can reach, the theme control, and the sign-out control.
 *
 * Filtering the navigation is a courtesy, not a security control. The API
 * rejects the request regardless, so a user who types a forbidden path gets
 * an error state rather than data.
 */
export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const unread = useQuery(unreadCountQueryOptions())
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(user.role.name, item.permission),
  )

  return (
    <div className="flex min-h-svh flex-col bg-muted/40 md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <aside className="flex shrink-0 flex-col border-b bg-sidebar md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4 md:justify-start">
          <span className="font-semibold tracking-tight">OPSflow</span>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <ProfileLink />
            <SignOutButton />
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              badge={item.to === '/notifications' ? unread.data?.count : undefined}
            />
          ))}
        </nav>

        <div className="mt-auto hidden border-t px-3 py-4 md:block">
          <Link
            to="/profile"
            className="block rounded-md px-2 py-1 transition-colors hover:bg-accent"
            activeProps={{ className: 'bg-accent' }}
          >
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{user.role.name}</p>
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton className="flex-1" />
          </div>
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-6 outline-none">
        {children}
      </main>
    </div>
  )
}

function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      // Without this the dashboard link stays active on every child route,
      // because "/" is a prefix of all of them.
      activeOptions={{ exact: item.to === '/' }}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap',
        'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
      )}
      activeProps={{ className: 'bg-accent text-accent-foreground' }}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? (
        <Badge variant="default" className="h-5 min-w-5 px-1">
          {badge > 99 ? '99+' : badge}
        </Badge>
      ) : null}
    </Link>
  )
}

/**
 * The way into your own profile. It is mounted twice, like sign-out: the
 * sidebar footer that carries your name is the natural place for it, but that
 * footer is desktop-only, so narrow screens get an icon beside sign-out in the
 * header instead. It is deliberately not a nav item — every other entry there
 * is a module, and this one is you.
 */
function ProfileLink({ className }: { className?: string }) {
  return (
    <Button asChild variant="outline" size="icon" className={className}>
      <Link to="/profile" aria-label="Your profile">
        <UserRound className="size-4" aria-hidden />
      </Link>
    </Button>
  )
}

function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      // Nothing cached under the old session may survive into the next one.
      queryClient.clear()
      await router.navigate({ to: '/login' })
    },
  })

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => signOut.mutate()}
      disabled={signOut.isPending}
    >
      <LogOut className="size-4" aria-hidden />
      {signOut.isPending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
