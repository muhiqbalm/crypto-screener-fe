import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { IconChip } from '@/components/ui/icon-title'
import { KpiTile } from '@/components/ui/kpi'
import { VerdictBadge, type VerdictInput } from '@/components/ui/verdict-badge'
import type { Tone } from '@/components/ui/tone'
import { templateShort } from '@/lib/lab/form'

/*
 * Lab variants of the shared v2 blocks (components/ui/*): a titled panel whose header wraps on
 * phones, a KPI tile for inside a hero card, the strategy chip and the verdict pill.
 */

/** Content card (rounded-3xl, 24px padding): icon chip + 18–20px title + one line, then the body. */
export function Panel({
  title,
  description,
  icon,
  tone = 'brand',
  aside,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: React.ReactNode
  /** One short line under the title. */
  description?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('min-w-0 rounded-3xl border bg-card p-5 text-card-foreground sm:p-6', className)}>
      {(title || aside) && (
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <div className="flex min-w-0 items-center gap-3">
              {icon && <IconChip icon={icon} tone={tone} />}
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">{title}</h2>
                {description && <p className="line-clamp-1 text-sm text-muted-foreground">{description}</p>}
              </div>
            </div>
          )}
          {aside && <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{aside}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

/** KPI inside a hero card: the shared KpiTile (count-up, display font) on a quieter surface. */
export function HeroKpi({
  label,
  value,
  format,
  tone,
  hint,
}: {
  label: React.ReactNode
  value: number | null
  format: (v: number) => string
  /** Colours the number (e.g. bullish/bearish for a signed result). */
  tone?: Tone
  hint?: React.ReactNode
}) {
  return (
    <KpiTile
      label={label}
      value={value ?? '—'}
      format={format}
      tone={tone ?? 'brand'}
      toneValue={Boolean(tone)}
      hint={hint}
      className="rounded-2xl border-border/60 bg-background/40 p-4 sm:p-5"
    />
  )
}

const STRATEGY_DOT: Record<string, string> = {
  rosyade_family: 'bg-brand',
  donchian_breakout: 'bg-lab',
  mean_reversion_range: 'bg-warn',
}

/** Strategy name as a chip (every result shows its strategy). Same height as the verdict pill. */
export function StrategyChip({
  templateId,
  name,
  size = 'sm',
  className,
}: {
  templateId: string
  name?: string | null
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-full border bg-muted/50 font-semibold text-foreground',
        size === 'md' ? 'h-8 px-3.5 text-sm' : 'h-7 px-3 text-2xs',
        className,
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', STRATEGY_DOT[templateId] ?? 'bg-muted-foreground')} aria-hidden="true" />
      {templateShort(templateId, name)}
    </span>
  )
}

/** Lolos / Gagal pill (icon + word); rows without a report say so instead of a dash. */
export function VerdictPill({
  verdict,
  emptyLabel = 'Tanpa rapor',
  size = 'sm',
  className,
}: {
  verdict: VerdictInput | string
  emptyLabel?: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}) {
  return <VerdictBadge verdict={verdict} size={size} emptyLabel={emptyLabel} className={className} />
}
