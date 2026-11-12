'use client'

/**
 * Peluang koin v2 look ("deck presentasi", modern): local primitives until the shared
 * ui-v2 foundation ships HeroCard / CoinAvatar / CountUp. Each one is small on purpose
 * so swapping to the shared component is a one-line change.
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatUsdCompact, formatUsdSigned } from '@/lib/utils/format'

// ── cards ────────────────────────────────────────────────────────────────

/** Big card with a thin gradient border and an optional soft glow behind the key number. */
export function HeroCard({ children, className, glow, interactive = false }: {
  children: React.ReactNode
  className?: string
  /** colour of the soft glow: 'long' | 'short' | 'info' | undefined (none) */
  glow?: 'long' | 'short' | 'info'
  interactive?: boolean
}) {
  return (
    <div className={cn(
      'relative rounded-3xl bg-gradient-to-br from-info/45 via-lab/25 to-border p-px',
      interactive && 'transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none',
      className,
    )}>
      <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-card p-6 sm:p-7">
        {glow && (
          <div aria-hidden="true" className={cn(
            'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl',
            glow === 'long' ? 'bg-bullish/20' : glow === 'short' ? 'bg-bearish/20' : 'bg-info/20',
          )} />
        )}
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

/** Plain v2 card: rounded-3xl, thin border, roomy padding. */
export function Panel({ children, className, title, icon, action }: {
  children: React.ReactNode
  className?: string
  title?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className={cn('rounded-3xl border bg-card p-6 sm:p-7', className)}>
      {(title || action) && (
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              {icon && <span className="text-info [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

// ── coin avatar ──────────────────────────────────────────────────────────

const AVATAR_HUES = [210, 265, 190, 320, 25, 150, 45, 235, 340, 170]

function hueFor(coin: string): number {
  let h = 0
  for (const ch of coin) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_HUES[h % AVATAR_HUES.length]
}

/** Circle with the coin's initials in a fixed colour per coin. */
export function CoinAvatar({ coin, size = 'md', className }: { coin: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const clean = coin.replace(/^1000/, '')
  const initials = clean.slice(0, clean.length > 4 ? 3 : Math.min(3, clean.length))
  const hue = hueFor(clean)
  const dim = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-sm', xl: 'h-16 w-16 text-base' }[size]
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ring-1 ring-white/10', dim, className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 40) % 360} 70% 38%))` }}>
      {initials}
    </span>
  )
}

// ── direction / confidence / status ──────────────────────────────────────

/** Big ▲ LONG / ▼ SHORT / – NETRAL pill (icon + word + colour). */
export function DirectionChip({ direction, size = 'md' }: { direction: 'LONG' | 'SHORT' | 'NETRAL' | string; size?: 'md' | 'lg' }) {
  const d = direction === 'LONG' ? 'long' : direction === 'SHORT' ? 'short' : 'netral'
  const Icon = d === 'long' ? ArrowUpRight : d === 'short' ? ArrowDownRight : Minus
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-bold tracking-wide',
      size === 'lg' ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm',
      d === 'long' && 'border-bullish/40 bg-bullish/15 text-bullish',
      d === 'short' && 'border-bearish/40 bg-bearish/15 text-bearish',
      d === 'netral' && 'border-border bg-muted/60 text-muted-foreground',
    )}>
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
      {d === 'long' ? 'LONG' : d === 'short' ? 'SHORT' : 'NETRAL'}
    </span>
  )
}

const LEVEL_N = { rendah: 1, sedang: 2, tinggi: 3 } as const

/** Keyakinan as 1–3 dots + the word (never colour alone). */
export function ConfidenceDots({ level, showWord = true, className }: { level: 'rendah' | 'sedang' | 'tinggi' | null | undefined; showWord?: boolean; className?: string }) {
  if (!level) return null
  const n = LEVEL_N[level]
  const tone = level === 'tinggi' ? 'bg-bullish' : level === 'sedang' ? 'bg-info' : 'bg-warn'
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)} aria-label={`keyakinan ${level}`}>
      <span className="inline-flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i <= n ? tone : 'bg-muted-foreground/25')} />
        ))}
      </span>
      {showWord && <span className="font-medium text-muted-foreground">{level}</span>}
    </span>
  )
}

/** Rounded pill for a small status (fase, label). */
export function Pill({ children, tone = 'muted', className, title }: {
  children: React.ReactNode
  tone?: 'muted' | 'info' | 'long' | 'short' | 'warn' | 'bullish' | 'bearish' | 'lab'
  className?: string
  title?: string
}) {
  return (
    <span title={title} className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium',
      tone === 'muted' && 'border-border bg-muted/50 text-muted-foreground',
      tone === 'info' && 'border-info/40 bg-info/10 text-info',
      (tone === 'long' || tone === 'bullish') && 'border-bullish/40 bg-bullish/10 text-bullish',
      (tone === 'short' || tone === 'bearish') && 'border-bearish/40 bg-bearish/10 text-bearish',
      tone === 'warn' && 'border-warn/40 bg-warn/10 text-warn',
      tone === 'lab' && 'border-lab/40 bg-lab/10 text-lab',
      className,
    )}>
      {children}
    </span>
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
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bullish" />TP dulu {pct(tp)}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bearish" />SL dulu {pct(sl)}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/50" />ditutup strategi {pct(bt)}</span>
        </div>
      )}
    </div>
  )
}

/** Small label above a big number. */
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
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={cn(
        'mt-1 font-bold tracking-tight tabular-nums',
        size === 'xl' ? 'text-4xl sm:text-5xl' : size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl',
        tone,
      )}>{value}</div>
      {sub && <div className="mt-1 text-[13px] text-muted-foreground">{sub}</div>}
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

// ── count-up ─────────────────────────────────────────────────────────────

/** Animates a number from 0 on first mount (skipped with prefers-reduced-motion). */
export function CountUp({ value, format, durationMs = 650 }: { value: number; format: (v: number) => string; durationMs?: number }) {
  const [shown, setShown] = useState(value)
  const done = useRef(false)
  useEffect(() => {
    if (done.current) {
      const id = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(id)
    }
    done.current = true
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !Number.isFinite(value) || value === 0) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs)
      setShown(value * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])
  return <>{format(shown)}</>
}
