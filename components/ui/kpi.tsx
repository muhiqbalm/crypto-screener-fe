import Link from 'next/link'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Sparkline } from '@/components/ui/sparkline'
import { CountUp } from '@/components/ui/count-up'
import { IconChip } from '@/components/ui/icon-title'
import { TONE_TEXT, signTone, type Tone } from '@/components/ui/tone'
import { formatPct } from '@/lib/utils/format'

export interface KpiDelta {
  value: number
  /** Default: signed percent "+1.2%". */
  format?: (v: number) => string
  /** Small word after it, e.g. "7 hari". */
  label?: string
  /** Colour: default by sign (green up, red down). */
  tone?: Tone
}

export interface KpiTileProps {
  label: React.ReactNode
  /** Pre-formatted value, or a number with `format` (enables count-up). */
  value: React.ReactNode | number
  format?: (n: number) => string
  /** Count up on first view (number `value` only). Default true. */
  countUp?: boolean
  icon?: LucideIcon
  /** Colour of the icon chip and the value. Default: neutral value, brand icon. */
  tone?: Tone
  /** Colour the value itself with `tone`. */
  toneValue?: boolean
  unit?: React.ReactNode
  delta?: KpiDelta | null
  /** One short line under the value. */
  hint?: React.ReactNode
  /** 7 days / 14 candles. */
  sparkline?: readonly (number | null | undefined)[]
  sparklineTone?: Tone | 'auto'
  sparklineLabel?: string
  /** Whole tile becomes a link ("Lihat …"). */
  href?: string
  size?: 'md' | 'lg'
  loading?: boolean
  className?: string
}

function DeltaChip({ d }: { d: KpiDelta }) {
  const tone = d.tone ?? signTone(d.value)
  const Icon = d.value > 0 ? ArrowUpRight : d.value < 0 ? ArrowDownRight : Minus
  const text = (d.format ?? ((v: number) => formatPct(v, { signed: true })))(d.value)
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-sm font-semibold', TONE_TEXT[tone])}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="num">{text}</span>
      {d.label && <span className="ml-1 font-normal text-muted-foreground">{d.label}</span>}
    </span>
  )
}

/**
 * KPI tile v2: icon + label, a big number (30–40px), optional delta and
 * sparkline, one hint line. Use 3–4 per row at most.
 */
export function KpiTile({
  label,
  value,
  format,
  countUp = true,
  icon,
  tone = 'brand',
  toneValue,
  unit,
  delta,
  hint,
  sparkline,
  sparklineTone = 'auto',
  sparklineLabel,
  href,
  size = 'md',
  loading,
  className,
}: KpiTileProps) {
  const big = size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
  const valueNode =
    typeof value === 'number' ? (
      countUp ? (
        <CountUp value={value} format={format ?? ((n) => String(Math.round(n)))} />
      ) : (
        (format ?? String)(value)
      )
    ) : (
      value
    )
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {icon && <IconChip icon={icon} tone={tone} size="sm" />}
        <span className="eyebrow truncate">{label}</span>
        {href && <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
      </div>
      {loading ? (
        <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" aria-busy="true" />
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn('num display font-extrabold leading-none', big, toneValue && TONE_TEXT[tone])}>{valueNode}</span>
          {unit && <span className="text-base font-semibold text-muted-foreground">{unit}</span>}
          {delta && <DeltaChip d={delta} />}
        </div>
      )}
      {hint && <p className="truncate text-sm text-muted-foreground">{hint}</p>}
      {sparkline && !loading && <Sparkline data={sparkline} tone={sparklineTone} label={sparklineLabel} height={40} className="mt-auto" />}
    </>
  )
  const cls = cn('group flex min-w-0 flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6', href && 'lift hover:border-brand/40', className)
  return href ? (
    <Link href={href} className={cn(cls, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
