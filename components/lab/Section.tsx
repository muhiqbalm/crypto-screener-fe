import { cn } from '@/lib/utils/cn'

/**
 * Card section used across Lab / Chart panels / Journal so spacing and
 * headings stay consistent: 20px padding, 14px semibold title, muted 12px
 * description, optional right-aligned action.
 */
export function Section({
  title,
  description,
  icon,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
          <div className="min-w-0 space-y-0.5">
            {title && (
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                {icon}
                {title}
              </h2>
            )}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('px-4 pb-4 pt-3 sm:px-5 sm:pb-5', !title && !action && 'pt-4', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Small uppercase label used above fields / stat values. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-3xs font-mono font-semibold uppercase tracking-wider text-muted-foreground', className)}>
      {children}
    </div>
  )
}

/** Pill-shaped toggle button (segmented controls, presets, filters). */
export function Chip({
  active,
  onClick,
  children,
  className,
  disabled,
  title,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-lab/50 bg-lab/10 text-lab'
          : 'border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Empty state with a single clear call to action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-6 py-10 text-center">
      {icon && <div className="text-muted-foreground/70">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
