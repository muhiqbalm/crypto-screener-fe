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
    <section id={id} className={cn('rounded-3xl border border-border bg-card text-card-foreground', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0 space-y-1">
            {title && (
              <h2 className="flex items-center gap-2.5 text-lg font-bold leading-tight tracking-tight [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-brand">
                {icon}
                {title}
              </h2>
            )}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('px-5 pb-5 pt-4 sm:px-6 sm:pb-6', !title && !action && 'pt-5 sm:pt-6', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Small uppercase label used above fields / stat values. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('eyebrow', className)}>
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
          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Empty state — re-exported from the shared shell states. */
export { EmptyState } from '@/components/shell/states'
