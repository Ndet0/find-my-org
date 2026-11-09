import { cn } from '@/lib/utils'

/** A small initials chip plus the person's name, used in rows and properties. */
export function AvatarChip({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
        {initials || '·'}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}
