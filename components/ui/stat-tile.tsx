import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkline } from '@/components/ui/sparkline'
import { TONE_TEXT, signTone, type Tone } from '@/components/ui/tone'
import { formatPct } from '@/lib/utils/format'
import type { KpiDelta } from '@/components/ui/kpi'

/**
 * KPI tile: uppercase label, big tabular number (30px+), optional delta,
 * hint line and sparkline. `valueClassName` takes a tone such as
 * signClass(v) or 'text-bullish'. For icon chips, links and count-up use
 * <KpiTile> (components/ui/kpi.tsx).
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
  delta,
  sparkline,
  sparklineTone = 'auto',
  size = 'md',
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
  delta?: KpiDelta | null
  sparkline?: readonly (number | null | undefined)[]
  sparklineTone?: Tone | 'auto'
  /** 'sm' for dense grids (24px number). */
  size?: 'sm' | 'md'
}) {
  const dTone = delta ? (delta.tone ?? signTone(delta.value)) : 'muted'
  const DIcon = delta ? (delta.value > 0 ? ArrowUpRight : delta.value < 0 ? ArrowDownRight : Minus) : Minus
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 rounded-3xl border bg-card p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow truncate">{label}</div>
        {icon && <div className="shrink-0 text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">{icon}</div>}
      </div>
      {loading ? (
        <Skeleton className="h-9 w-28" />
      ) : children ? (
        children
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className={cn('num display truncate font-extrabold leading-none', size === 'sm' ? 'text-2xl' : 'text-3xl', valueClassName)}>{value}</div>
          {delta && (
            <span className={cn('inline-flex items-center gap-0.5 text-sm font-semibold', TONE_TEXT[dTone])}>
              <DIcon className="h-4 w-4" aria-hidden="true" />
              <span className="num">{(delta.format ?? ((v: number) => formatPct(v, { signed: true })))(delta.value)}</span>
              {delta.label && <span className="ml-1 font-normal text-muted-foreground">{delta.label}</span>}
            </span>
          )}
        </div>
      )}
      {hint !== undefined && <div className="truncate text-sm text-muted-foreground">{hint}</div>}
      {sparkline && !loading && <Sparkline data={sparkline} tone={sparklineTone} height={36} />}
    </div>
  )
}
