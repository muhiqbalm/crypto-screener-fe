import { cn } from '@/lib/utils/cn'
import { TONE_BG, type Tone } from '@/components/ui/tone'

/**
 * Progress bar for x/30 trades, safe ranges and scores. Always give `label`
 * (screen readers) and usually show the numbers next to it (`showValue`).
 *
 *   <ProgressBar value={12} max={30} tone="lab" label="Progres menuju 30 trade" showValue />
 */
export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  size = 'md',
  label,
  showValue,
  valueText,
  className,
}: {
  value: number
  max?: number
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  label: string
  /** Print "12 / 30" (or `valueText`) above the bar on the right. */
  showValue?: boolean
  valueText?: string
  className?: string
}) {
  const safeMax = max > 0 ? max : 1
  const v = Number.isFinite(value) ? Math.max(0, Math.min(value, safeMax)) : 0
  const pct = (v / safeMax) * 100
  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {showValue && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">{label}</span>
          <span className="num shrink-0 font-semibold">{valueText ?? `${Math.round(value)} / ${max}`}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={v}
        aria-valuetext={valueText ?? `${Math.round(value)} dari ${max}`}
        className={cn('w-full overflow-hidden rounded-full bg-muted', size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2')}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', TONE_BG[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
