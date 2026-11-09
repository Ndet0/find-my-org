export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-[12px] text-muted-foreground tabular-nums">{clamped}%</span>
    </div>
  )
}
