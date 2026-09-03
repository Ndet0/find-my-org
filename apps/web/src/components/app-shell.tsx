import { can, type Permission } from '@opsflow/types/permissions'
import type { CurrentUser } from '@opsflow/types/user'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Building2,
  Contact,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

type NavItem = {
  to: '/' | '/projects' | '/users' | '/departments' | '/clients'
  label: string
  icon: LucideIcon
  /** Omitted for destinations every signed-in user may reach. */
  permission?: Permission
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban, permission: 'projects:read' },
  { to: '/clients', label: 'Clients', icon: Contact, permission: 'clients:read' },
  { to: '/users', label: 'Team', icon: Users, permission: 'users:read' },
  { to: '/departments', label: 'Departments', icon: Building2, permission: 'departments:read' },
]

/**
 * The frame around every authenticated page: navigation filtered to what the
 * caller's role can reach, and the sign-out control.
 *
 * Filtering the navigation is a courtesy, not a security control. The API
 * rejects the request regardless, so a user who types a forbidden path gets
 * an error state rather than data.
 */
export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(user.role.name, item.permission),
  )

  return (
    <div className="flex min-h-svh flex-col bg-muted/40 md:flex-row">
      <aside className="flex shrink-0 flex-col border-b bg-sidebar md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4 md:justify-start">
          <span className="font-semibold tracking-tight">OPSflow</span>
          <SignOutButton className="md:hidden" />
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
          {visibleItems.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto hidden border-t px-3 py-4 md:block">
          <p className="truncate px-2 text-sm font-medium">{user.name}</p>
          <p className="truncate px-2 text-xs text-muted-foreground capitalize">{user.role.name}</p>
          <SignOutButton className="mt-3 w-full" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  )
}

function NavLink({ item }: { item: NavItem }) {
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
      {item.label}
    </Link>
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
