'use client'

import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { CoinAvatar as UiCoinAvatar } from '@/components/ui/coin-avatar'
import { CountUp as UiCountUp } from '@/components/ui/count-up'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Sparkline } from '@/components/ui/sparkline'
import { TONE_VAR, signTone, type Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'

/**
 * "Deck" building blocks for the W3b pages (Preset, Paper berjalan, Jurnal, Rekam jejak,
 * Laporan), in the style of docs/bmtm-briefing.html (06-desain-v2.md §2–§4b). Thin layer
 * over the shared ui-v2 primitives (tone, CountUp, Sparkline, ProgressBar, CoinAvatar and the
 * ring-gradient / glass / lift utilities) plus the few pieces those do not cover: a card with
 * an icon header that can be one big button, big numbers, a ring, a rate bar, rank badges.
 */

export type { Tone }
export { signTone }

const TEXT: Record<Tone, string> = {
  bullish: 'text-bullish',
  bearish: 'text-bearish',
  warn: 'text-warn',
  info: 'text-info',
  lab: 'text-lab',
  brand: 'text-brand',
  muted: 'text-muted-foreground',
}
const FILL: Record<Tone, string> = {
  bullish: 'bg-bullish',
  bearish: 'bg-bearish',
  warn: 'bg-warn',
  info: 'bg-info',
  lab: 'bg-lab',
  brand: 'bg-brand',
  muted: 'bg-muted-foreground/60',
}
const TINT: Record<Tone, string> = {
  bullish: 'border-bullish/35 bg-bullish/12 text-bullish',
  bearish: 'border-bearish/35 bg-bearish/12 text-bearish',
  warn: 'border-warn/40 bg-warn/12 text-warn',
  info: 'border-info/35 bg-info/12 text-info',
  lab: 'border-lab/35 bg-lab/12 text-lab',
  brand: 'border-brand/35 bg-brand/12 text-brand',
  muted: 'border-border bg-muted/60 text-muted-foreground',
}
const STROKE: Record<Tone, string> = {
  bullish: 'stroke-bullish',
  bearish: 'stroke-bearish',
  warn: 'stroke-warn',
  info: 'stroke-info',
  lab: 'stroke-lab',
  brand: 'stroke-brand',
  muted: 'stroke-muted-foreground',
}

export const toneText = (t: Tone) => TEXT[t]

// ── card ───────────────────────────────────────────────────────────────────

export interface DeckCardProps {
  icon?: LucideIcon
  iconTone?: Tone
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  /** Right side of the header (a pill, a link). */
  action?: React.ReactNode
  /** Gradient border + soft glow: one per page for the key message. */
  hero?: boolean
  /** Whole card clickable (lifts on hover). */
  onClick?: () => void
  ariaLabel?: string
  /** Coloured outline for emphasis (e.g. warn for "menyimpang"). */
  outline?: Tone
  highlighted?: boolean
  /** Stretch the content to the card height (put the footer in an element with mt-auto). */
  fill?: boolean
  className?: string
  bodyClassName?: string
  id?: string
  children?: React.ReactNode
}

export function DeckCard({
  icon: Icon,
  iconTone = 'info',
  eyebrow,
  title,
  action,
  hero,
  onClick,
  ariaLabel,
  outline,
  highlighted,
  fill,
  className,
  bodyClassName,
  id,
  children,
}: DeckCardProps) {
  const head = (Icon || title || eyebrow || action) && (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border sm:h-10 sm:w-10', TINT[iconTone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</div>}
          {title && <h3 className="text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-[17px]">{title}</h3>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
  const inner = (
    <div className={cn('relative h-full', fill && 'flex flex-col')}>
      {hero && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full opacity-30 blur-3xl print:hidden"
          style={{ background: TONE_VAR[iconTone === 'muted' ? 'brand' : iconTone] }}
        />
      )}
      {head}
      {children}
    </div>
  )
  const frame = cn(
    'group relative block h-full w-full min-w-0 rounded-3xl p-5 text-left text-card-foreground break-inside-avoid print:shadow-none sm:p-6',
    hero ? 'ring-gradient glass overflow-hidden' : 'border bg-card',
    outline && !hero && { bullish: 'border-bullish/50', bearish: 'border-bearish/50', warn: 'border-warn/60', info: 'border-info/50', lab: 'border-lab/50', brand: 'border-brand/50', muted: '' }[outline],
    highlighted && 'ring-2 ring-brand/70 ring-offset-2 ring-offset-background',
    onClick && 'lift cursor-pointer hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    bodyClassName,
    className,
  )
  if (onClick) {
    return (
      <button type="button" id={id} onClick={onClick} aria-label={ariaLabel} className={frame}>
        {inner}
      </button>
    )
  }
  return (
    <section id={id} className={frame}>
      {inner}
    </section>
  )
}

/** "Lihat …" link at the bottom of a card. */
export function CardLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-1.5 text-sm font-medium text-info hover:underline print:hidden', className)}>
      {children} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

/** Section title between card groups: icon + 20–22px heading (+ optional right side). */
export function SectionHead({ icon: Icon, title, sub, action, id }: { icon?: LucideIcon; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-[22px]">
          {Icon && <Icon className="h-5 w-5 text-info" aria-hidden="true" />}
          {title}
        </h2>
        {sub && <p className="mt-1 text-[15px] text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

// ── numbers ────────────────────────────────────────────────────────────────

/** Counts up once when shown (shared CountUp: respects prefers-reduced-motion). */
export function CountUp({ value, format, duration }: { value: number; format: (v: number) => string; duration?: number }) {
  return <UiCountUp value={value} format={format} duration={duration} />
}

const VALUE_SIZE = {
  sm: 'text-[22px] leading-8 sm:text-2xl',
  md: 'text-[26px] leading-8 sm:text-[30px] sm:leading-9',
  lg: 'text-[32px] leading-10 sm:text-[40px] sm:leading-[2.75rem]',
  xl: 'text-[40px] leading-none sm:text-[56px]',
} as const

/** Uppercase label → big number → one hint line. */
export function BigNumber({
  label,
  value,
  tone,
  hint,
  size = 'md',
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  tone?: Tone
  hint?: React.ReactNode
  size?: keyof typeof VALUE_SIZE
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={cn('font-display mt-1.5 truncate font-bold tabular-nums tracking-tight', VALUE_SIZE[size], tone && TEXT[tone])}>{value}</div>
      {hint && <div className="mt-1 truncate text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

// ── bars, rings, sparklines ────────────────────────────────────────────────

/** Progress bar (x/30 transaksi, rentang, skor) — the shared ProgressBar without its label row. */
export function Meter({ value, max, tone = 'lab', label, className }: { value: number; max: number; tone?: Tone; label?: string; className?: string }) {
  return <ProgressBar value={value} max={max} tone={tone} size="lg" label={label ?? `${value} dari ${max}`} className={className} />
}

/** Progress ring with the count in the middle (x/30). */
export function Ring({ value, max, tone = 'lab', size = 72, label, children }: { value: number; max: number; tone?: Tone; size?: number; label?: string; children?: React.ReactNode }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value} dari ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cn(STROKE[tone], 'transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none')}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-center">{children}</span>
    </div>
  )
}

/** Tiny line chart (shared Sparkline); colour follows the direction unless a tone is given. */
export function Spark({ values, tone, width = 120, height = 36, className, label }: { values: number[]; tone?: Tone; width?: number; height?: number; className?: string; label?: string }) {
  if (values.filter((x) => Number.isFinite(x)).length < 2) return <span className={cn('inline-block text-[13px] text-muted-foreground', className)}>—</span>
  return (
    <div className={cn('shrink-0', className)} style={{ width }}>
      <Sparkline data={values} tone={tone ?? 'auto'} height={height} area label={label ?? 'Grafik kecil'} />
    </div>
  )
}

/** Horizontal rate bar with a 50% marker (hit rate: right more often than a coin flip?). */
export function RateBar({ rate, tone, className }: { rate: number | null | undefined; tone?: Tone; className?: string }) {
  const pct = rate === null || rate === undefined || !Number.isFinite(rate) ? null : Math.max(0, Math.min(1, rate)) * 100
  return (
    <div className={cn('relative h-3 w-full overflow-hidden rounded-full bg-muted', className)} role="img" aria-label={pct === null ? 'tidak tersedia' : `${Math.round(pct)}% benar`}>
      {pct !== null && <div className={cn('h-full rounded-full', FILL[tone ?? (pct >= 50 ? 'bullish' : 'bearish')])} style={{ width: `${pct}%` }} />}
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-foreground/40" />
    </div>
  )
}

// ── pills, badges, avatars ─────────────────────────────────────────────────

/** Big status pill (13px, roomy, icon + word). */
export function Pill({ tone = 'muted', icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] font-semibold leading-5', TINT[tone], className)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Rank circle for leaderboards; #1 gets the accent gradient. */
export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'font-display inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold tabular-nums',
        rank === 1 ? 'bg-gradient-to-br from-info to-lab text-background' : rank <= 3 ? 'border border-info/40 bg-info/12 text-info' : 'border bg-muted/60 text-muted-foreground',
      )}
      aria-label={`Peringkat ${rank}`}
    >
      {rank}
    </span>
  )
}

/** Coin initials in a circle with a fixed colour per coin (shared CoinAvatar). */
export function CoinAvatar({ coin, size = 40 }: { coin: string; size?: number }) {
  return <UiCoinAvatar symbol={coin} size={size >= 44 ? 'lg' : size >= 36 ? 'md' : 'sm'} />
}
