import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * KPI tile: eyebrow label, big tabular number, optional hint line.
 * `valueClassName` takes a tone such as signClass(v) or 'text-bullish'.
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  valueClassName,
  loading,
  className,
  children,
}: {
  label: React.ReactNode
  value?: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
  valueClassName?: string
  loading?: boolean
  className?: string
  /** Custom body instead of a single value (e.g. IS vs holdout pair). */
  children?: React.ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-3.5 shadow-xs', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow truncate">{label}</div>
        {icon && <div className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</div>}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : children ? (
        children
      ) : (
        <div className={cn('num truncate text-xl font-bold leading-7', valueClassName)}>{value}</div>
      )}
      {hint !== undefined && <div className="truncate text-2xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
