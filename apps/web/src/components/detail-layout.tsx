import type { ReactNode } from 'react'

/** Title and discussion on the left, properties on the right. */
export function DetailLayout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_272px]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="flex flex-col gap-4 lg:sticky lg:top-0">{side}</div>
    </div>
  )
}

export function Properties({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-0.5">
      <h2 className="px-1.5 pb-1 text-[12px] font-medium text-muted-foreground">Properties</h2>
      <dl className="flex flex-col">{children}</dl>
    </section>
  )
}

export function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors duration-150 hover:bg-accent/70">
      <dt className="w-[5.5rem] shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}
