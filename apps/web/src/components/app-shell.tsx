import type { CurrentUser } from '@opsflow/types/user'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronRight, LogOut, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { type NavItem, visibleNavItems } from '@/components/nav-items'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { dmUnreadCountQueryOptions } from '@/lib/dm'
import { forgetMessagingSecrets } from '@/lib/dm-identity'
import { unreadCountQueryOptions } from '@/lib/notifications'
import { cn } from '@/lib/utils'

type NavGroup = {
  label: string
  items: readonly NavItem['to'][]
}

const GROUPS: readonly NavGroup[] = [
  { label: 'Workspace', items: ['/', '/activity', '/notifications'] },
  { label: 'Work', items: ['/projects', '/tasks', '/clients', '/messages'] },
  { label: 'Directory', items: ['/users', '/departments'] },
]

const CRUMB_LABELS: Record<string, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  clients: 'Clients',
  users: 'Team',
  departments: 'Departments',
  activity: 'Activity',
  notifications: 'Notifications',
  messages: 'Messages',
  profile: 'Settings',
  new: 'New',
  edit: 'Edit',
  password: 'Password',
}

const CRUMB_TO = {
  projects: '/projects',
  tasks: '/tasks',
  clients: '/clients',
  users: '/users',
  departments: '/departments',
  activity: '/activity',
  notifications: '/notifications',
  messages: '/messages',
  profile: '/profile',
} as const

/**
 * The frame around every authenticated page: navigation filtered to what the
 * caller's role can reach, the sign-out control, and the theme control.
 *
 * Filtering the navigation is a courtesy, not a security control. The API
 * rejects the request regardless, so a user who types a forbidden path gets
 * an error state rather than data.
 */
export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const unread = useQuery(unreadCountQueryOptions())
  const unreadMessages = useQuery(dmUnreadCountQueryOptions())
  const visibleItems = visibleNavItems(user.role.name)

  function badgeFor(to: NavItem['to']) {
    if (to === '/notifications') return unread.data?.count
    if (to === '/messages') return unreadMessages.data?.count
    return undefined
  }

  const groups = GROUPS.map((group) => ({
    ...group,
    items: visibleItems.filter((item) => group.items.includes(item.to)),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex min-h-svh bg-sidebar text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-[13px] focus:shadow"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col md:flex">
        <div className="flex h-11 items-center gap-2 px-3">
          <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[11px] font-medium text-primary-foreground">
            O
          </span>
          <span className="truncate text-[13px] font-medium text-foreground">OPSflow</span>
        </div>

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 pb-2">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <p className="px-2 pt-1 pb-1 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.to} item={item} badge={badgeFor(item.to)} />
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 px-2 py-3">
          <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">Settings</p>
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
          >
            <UserRound className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{user.name}</span>
          </Link>
          <ThemeToggle className="justify-start px-2 text-sidebar-foreground" />
          <SignOutButton className="justify-start px-2 text-sidebar-foreground" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col p-2">
        <header className="flex h-10 items-center gap-2 px-1.5">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[11px] font-medium text-primary-foreground">
              O
            </span>
          </div>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-1 md:hidden">
            <Button asChild variant="ghost" size="icon">
              <Link to="/profile" aria-label="Your profile">
                <UserRound className="size-4" aria-hidden />
              </Link>
            </Button>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
          <nav className="flex gap-0.5 overflow-x-auto border-b px-2 py-1.5 md:hidden">
            {visibleItems.map((item) => (
              <NavLink key={item.to} item={item} badge={badgeFor(item.to)} compact />
            ))}
          </nav>
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-auto p-4 outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function NavLink({ item, badge, compact }: { item: NavItem; badge?: number; compact?: boolean }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === '/' }}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] whitespace-nowrap text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        compact && 'px-2 py-1',
      )}
      activeProps={{ className: 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' }}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

function Breadcrumbs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return <span className="truncate text-[13px] text-muted-foreground">Dashboard</span>
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5 text-[13px]">
      <Link
        to="/"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        const label = CRUMB_LABELS[segment] ?? 'Details'
        const to = CRUMB_TO[segment as keyof typeof CRUMB_TO]
        const current = index === segments.length - 1
        return (
          <span
            key={segments.slice(0, index + 1).join('/')}
            className="flex min-w-0 items-center gap-0.5"
          >
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {to && !current ? (
              <Link
                to={to}
                className="truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ) : (
              <span
                className={cn('truncate', current ? 'text-foreground' : 'text-muted-foreground')}
              >
                {label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      forgetMessagingSecrets()
      queryClient.clear()
      await router.navigate({ to: '/login' })
    },
  })

  return (
    <Button
      variant="ghost"
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
