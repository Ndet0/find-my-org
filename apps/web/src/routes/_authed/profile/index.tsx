import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AvatarChip } from '@/components/avatar-chip'
import { Button } from '@/components/ui/button'
import { currentUserQueryOptions } from '@/lib/current-user'

/**
 * Your own profile. There is no permission check: every active user may read
 * and edit themselves, whatever their role, which is why `/api/me` sits behind
 * `requireAuth` alone.
 */
export const Route = createFileRoute('/_authed/profile/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentUserQueryOptions),
  component: ProfilePage,
})

function ProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions)

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-medium">Profile</h1>
          <p className="text-[13px] text-muted-foreground">{user.email}</p>
        </div>
        <AvatarChip name={user.name} />
      </header>

      <section className="divide-y rounded-lg border">
        <SettingRow label="Name" value={user.name} />
        <SettingRow label="Role" value={user.role.name} capitalize />
        <SettingRow label="Department" value={user.department?.name ?? 'Unassigned'} />
        <SettingRow label="Position" value={user.position ?? 'Unassigned'} />
        <SettingRow label="Phone" value={user.phone ?? 'Not provided'} />
        <SettingRow label="Joined" value={user.joinedAt ?? 'Unknown'} />
      </section>

      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link to="/profile/edit">Edit profile</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/profile/password">Change password</Link>
        </Button>
      </div>
      <p className="text-[12px] text-muted-foreground">
        Changing your password signs you out everywhere else, but not on this device.
      </p>
    </div>
  )
}

function SettingRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={capitalize ? 'capitalize' : undefined}>{value}</span>
    </div>
  )
}
