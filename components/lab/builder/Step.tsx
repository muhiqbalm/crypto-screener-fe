import { cn } from '@/lib/utils/cn'

/**
 * One numbered step of "Uji strategi" (design v2): a big rounded card, a 40px number tile,
 * a 20–24px title and at most one line under it. Server-safe (no hooks).
 */
export function Step({
  n,
  title,
  description,
  aside,
  children,
  className,
  id,
}: {
  n: number
  title: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned extras on the title row (e.g. the importance basis). */
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} aria-labelledby={`step-${n}-title`} className={cn('rounded-3xl border border-border bg-card text-card-foreground', className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="display inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-xl font-extrabold text-brand"
            aria-hidden="true"
          >
            {n}
          </span>
          <div className="min-w-0">
            <h2 id={`step-${n}-title`} className="text-xl font-bold tracking-tight sm:text-2xl">
              <span className="sr-only">Langkah {n}: </span>
              {title}
            </h2>
            {description && <p className="line-clamp-1 text-base text-muted-foreground">{description}</p>}
          </div>
        </div>
        {aside && <div className="min-w-0 text-sm text-muted-foreground sm:pt-2">{aside}</div>}
      </header>
      <div className="px-5 pb-6 pt-5 sm:px-8 sm:pb-8">{children}</div>
    </section>
  )
}
