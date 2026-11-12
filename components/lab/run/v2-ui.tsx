'use client'

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { VerdictBadge, type VerdictInput } from '@/components/ui/verdict-badge'
import { templateShort } from '@/lib/lab/form'

/*
 * Deck-style building blocks for the Lab pages (design v2). Local stand-ins: once the shared v2
 * foundation (Card / HeroCard / CountUp / glow utilities) is merged, these delegate to it.
 */

/** Big rounded panel: icon tile + 18–20px title, generous padding, one message per panel. */
export function Panel({
  title,
  description,
  icon: Icon,
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
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('rounded-3xl border border-border bg-card text-card-foreground', className)}>
      {(title || aside) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          {title && (
            <div className="flex min-w-0 items-center gap-3">
              {Icon && (
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
                {description && <p className="line-clamp-1 text-[15px] text-muted-foreground">{description}</p>}
              </div>
            </div>
          )}
          {aside && <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{aside}</div>}
        </header>
      )}
      <div className={cn('px-5 pb-5 pt-4 sm:px-6 sm:pb-6', !title && !aside && 'pt-5 sm:pt-6', bodyClassName)}>{children}</div>
    </section>
  )
}

export type HeroTone = 'pass' | 'fail' | 'neutral'

const HERO_BORDER: Record<HeroTone, string> = {
  pass: 'from-bullish/70 via-border to-info/50',
  fail: 'from-bearish/70 via-border to-warn/40',
  neutral: 'from-info/60 via-border to-lab/50',
}
const HERO_GLOW: Record<HeroTone, string> = { pass: 'bg-bullish/25', fail: 'bg-bearish/25', neutral: 'bg-info/20' }

/** Hero card: thin gradient border and a soft glow behind the main number (only for the one key card). */
export function HeroPanel({ tone, children, className }: { tone: HeroTone; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative rounded-3xl bg-gradient-to-br p-px', HERO_BORDER[tone], className)}>
      <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-card/95 p-6 backdrop-blur sm:p-8">
        <div aria-hidden="true" className={cn('pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full blur-3xl', HERO_GLOW[tone])} />
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

function reducedMotion(): boolean {
  try {
    return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/** Number that counts up when it first appears (no animation with prefers-reduced-motion). */
export function CountUp({ value, format, durationMs = 700 }: { value: number | null; format: (v: number | null) => string; durationMs?: number }) {
  const [progress, setProgress] = useState(() => (value === null || reducedMotion() ? 1 : 0))
  useEffect(() => {
    if (value === null || reducedMotion()) return
    let raf = 0
    let t0: number | null = null
    const tick = (t: number) => {
      t0 ??= t
      const p = Math.min(1, (t - t0) / durationMs)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])
  const eased = 1 - Math.pow(1 - progress, 3)
  return <>{format(value === null ? null : value * eased)}</>
}

/** Big KPI: label (uppercase 12px) + number 32–40px + one hint line. */
export function BigKpi({
  label,
  value,
  format,
  valueClassName,
  hint,
}: {
  label: React.ReactNode
  value: number | null
  format: (v: number | null) => string
  valueClassName?: string
  hint?: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="eyebrow truncate text-xs">{label}</div>
      <div className={cn('num truncate text-3xl font-bold tracking-tight sm:text-4xl', valueClassName)}>
        <CountUp value={value} format={format} />
      </div>
      {hint && <div className="truncate text-sm text-muted-foreground">{hint}</div>}
    </div>
  )
}

const STRATEGY_DOT: Record<string, string> = {
  rosyade_family: 'bg-info',
  donchian_breakout: 'bg-lab',
  mean_reversion_range: 'bg-muted-foreground',
}

/** Strategy name as a chip (every result shows its strategy). */
export function StrategyChip({ templateId, name, className }: { templateId: string; name?: string | null; className?: string }) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted/40 px-3 text-[13px] font-semibold', className)}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', STRATEGY_DOT[templateId] ?? 'bg-muted-foreground')} aria-hidden="true" />
      {templateShort(templateId, name)}
    </span>
  )
}

/** Lolos / Gagal as a big pill (13px, icon + word). */
export function VerdictPill({ verdict, emptyLabel = 'Tanpa rapor', className }: { verdict: VerdictInput | string; emptyLabel?: React.ReactNode; className?: string }) {
  return <VerdictBadge verdict={verdict} size="md" emptyLabel={emptyLabel} className={cn('px-3 py-1 text-[13px]', className)} />
}
