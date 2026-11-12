import { cn } from '@/lib/utils/cn'

/**
 * One numbered step of the "Uji strategi" form: number + title + one-line description, then the
 * step's content. Server-safe (no hooks).
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
    <section id={id} aria-labelledby={`step-${n}-title`} className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-lab/40 bg-lab/10 text-xs font-bold text-lab"
            aria-hidden="true"
          >
            {n}
          </span>
          <div className="min-w-0 space-y-0.5">
            <h2 id={`step-${n}-title`} className="text-sm font-semibold tracking-tight">
              <span className="sr-only">Langkah {n}: </span>
              {title}
            </h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {aside && <div className="min-w-0 text-2xs text-muted-foreground sm:max-w-[50%] sm:text-right">{aside}</div>}
      </header>
      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">{children}</div>
    </section>
  )
}
