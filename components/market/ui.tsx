'use client'

/**
 * Peluang koin building blocks on top of the shared v2 components: a titled panel,
 * the big direction chip, status pills, the outcome bar of similar calls and the
 * label-over-big-number stat. Cards, avatars, dots and count-up come from components/ui.
 */
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { IconTitle } from '@/components/ui/icon-title'
import { Panel } from '@/components/ui/hero-card'
import type { Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'
import { formatUsdCompact, formatUsdSigned } from '@/lib/utils/format'

export { BentoGrid, HeroCard, Panel } from '@/components/ui/hero-card'
export { CoinAvatar } from '@/components/ui/coin-avatar'
export { ConfidenceDots } from '@/components/ui/confidence-dots'
export { CountUp } from '@/components/ui/count-up'

/** Panel with the standard icon + title header and an optional action on the right. */
export function TitledPanel({ title, icon, subtitle, action, children, className, span }: {
  title: React.ReactNode
  icon: LucideIcon
  subtitle?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  span?: 1 | 2 | 3
}) {
  return (
    <Panel className={className} span={span}>
      <IconTitle icon={icon} title={title} subtitle={subtitle} action={action} className="mb-5" />
      {children}
    </Panel>
  )
}

/** Big LONG / SHORT / NETRAL pill (arrow + word + colour), the app-wide DirectionBadge enlarged. */
export function DirectionChip({ direction, size = 'md' }: { direction: string; size?: 'md' | 'lg' }) {
  return (
    <DirectionBadge direction={direction} size="md" className={size === 'lg' ? 'h-10 px-4 text-base [&_svg]:size-5' : undefined} />
  )
}

const PILL_TONE: Record<string, Tone> = { long: 'bullish', short: 'bearish' }

/** Rounded status pill (fase, peluang label). */
export function Pill({ children, tone = 'muted', className, title }: {
  children: React.ReactNode
  tone?: Tone | 'long' | 'short'
  className?: string
  title?: string
}) {
  const t = (PILL_TONE[tone] ?? tone) as Tone
  return (
    <Badge variant={t} title={title} className={cn('px-3 py-1 text-2xs', className)}>
      {children}
    </Badge>
  )
}

/** Outcome mix of similar calls as one stacked bar: TP first / SL first / closed by the strategy. */
export function EvidenceBar({ pTp, pSl, pBatal, className, showLegend = false }: {
  pTp: number | null | undefined
  pSl: number | null | undefined
  pBatal: number | null | undefined
  className?: string
  showLegend?: boolean
}) {
  const tp = Math.max(0, pTp ?? 0)
  const sl = Math.max(0, pSl ?? 0)
  const bt = Math.max(0, pBatal ?? 0)
  const rest = Math.max(0, 1 - tp - sl - bt)
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img"
        aria-label={`Kasus serupa: TP dulu ${pct(tp)}, SL dulu ${pct(sl)}, ditutup strategi ${pct(bt)}`}>
        <span className="bg-bullish" style={{ width: pct(tp) }} />
        <span className="bg-bearish" style={{ width: pct(sl) }} />
        <span className="bg-muted-foreground/40" style={{ width: pct(bt) }} />
        <span className="bg-muted-foreground/20" style={{ width: pct(rest) }} />
      </div>
      {showLegend && <EvidenceLegend className="mt-2" tp={pct(tp)} sl={pct(sl)} bt={pct(bt)} />}
    </div>
  )
}

export function EvidenceLegend({ tp, sl, bt, className }: { tp?: string; sl?: string; bt?: string; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground', className)}>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bullish" />TP dulu{tp ? ` ${tp}` : ''}</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bearish" />SL dulu{sl ? ` ${sl}` : ''}</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/50" />ditutup strategi{bt ? ` ${bt}` : ''}</span>
    </div>
  )
}

/** Small label above a big number (no card around it). */
export function BigStat({ label, value, sub, tone, size = 'lg', className }: {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: string
  size?: 'md' | 'lg' | 'xl'
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="eyebrow">{label}</div>
      <div className={cn(
        'num display mt-1 font-bold',
        size === 'xl' ? 'text-4xl sm:text-5xl' : size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl',
        tone,
      )}>{value}</div>
      {sub && <div className="mt-1 text-2xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

/** Dollar amount for a big number: cents only under $100, compact from $10K ("+$12K"). */
export function bigUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 10_000) return formatUsdCompact(v, { signed: true })
  if (abs >= 100) return `${v < 0 ? '−' : v > 0 ? '+' : ''}$${Math.round(abs).toLocaleString('en-US')}`
  return formatUsdSigned(v)
}
