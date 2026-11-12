'use client'

/**
 * Peluang koin building blocks. These are deliberately thin: the app-wide versions
 * (HubTabs, Freshness, AnswerCard, MarketRibbon, AssistantSlot, InfoTip) come from the
 * ux-shell foundation; until it is merged this file provides the same roles with the
 * existing primitives, so swapping is a one-file change.
 */
import Link from 'next/link'
import { Bot, ChevronDown, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RegimeBadge } from '@/components/lab/outlook/RegimeBadge'
import { KOIN_VIEWS, formatWib, type KoinView } from '@/lib/lab/outlook'
import { relativeTime } from '@/lib/lab/form'
import { cn } from '@/lib/utils/cn'

/** Sub-tabs of /koin (max 3); real links so the view is in the URL (?view=). */
export function KoinTabs({ view }: { view: KoinView }) {
  return (
    <nav aria-label="Tampilan Peluang koin" className="flex w-full max-w-md rounded-lg border bg-muted/40 p-0.5 text-sm">
      {KOIN_VIEWS.map((v) => (
        <Link
          key={v.value}
          href={v.value === 'outlook' ? '/koin' : `/koin?view=${v.value}`}
          aria-current={v.value === view ? 'page' : undefined}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-center font-medium transition-colors',
            v.value === view ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  )
}

/** "Data close 4H 12 Nov 08:00 WIB · dihitung 3 mnt lalu · berikutnya ±12:03 WIB". */
export function FreshnessLine({ closeIso, computedAt, stale, className }: {
  closeIso: string | null | undefined
  computedAt?: string | null
  stale?: boolean
  className?: string
}) {
  const next = closeIso ? new Date(Date.parse(closeIso) + 4 * 3600_000 + 4 * 60_000).toISOString() : null
  return (
    <p className={cn('text-2xs text-muted-foreground', className)}>
      Data close 4H <span className="text-foreground">{formatWib(closeIso)}</span>
      {computedAt && <> · dihitung {relativeTime(computedAt)}</>}
      {next && <> · berikutnya ±{formatWib(next).replace(/^\d+ \w+ /, '')}</>}
      {stale && <Badge variant="warn" size="xs" className="ml-1.5">DATA TERLAMBAT</Badge>}
    </p>
  )
}

type AnswerTone = 'baik' | 'perlu_dicek' | 'buruk' | 'menunggu'
const TONE: Record<AnswerTone, string> = {
  baik: 'border-bullish/30 bg-bullish/[0.06]',
  perlu_dicek: 'border-warn/30 bg-warn/[0.06]',
  buruk: 'border-bearish/30 bg-bearish/[0.06]',
  menunggu: 'border-border bg-muted/30',
}

/** One-sentence answer first, then 2-3 key numbers. */
export function AnswerBox({ tone, children, stats, footer }: {
  tone: AnswerTone
  children: React.ReactNode
  stats?: { label: string; value: React.ReactNode; hint?: string }[]
  footer?: React.ReactNode
}) {
  return (
    <section className={cn('rounded-xl border p-4', TONE[tone])} aria-label="Jawaban">
      <div className="text-sm font-semibold leading-snug sm:text-base">{children}</div>
      {stats && stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="eyebrow truncate">{s.label}</dt>
              <dd className="num truncate text-sm font-semibold">{s.value}</dd>
              {s.hint && <dd className="truncate text-3xs text-muted-foreground">{s.hint}</dd>}
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-2 text-2xs text-muted-foreground">{footer}</div>}
    </section>
  )
}

/** Market context ribbon slot (BTC/ETH condition). The full ribbon (whale, funding, fear-greed) is shared app-wide. */
export function RibbonSlot({ extra }: { extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 overflow-x-auto rounded-lg border bg-muted/20 px-3 py-2 text-xs">
      <RegimeBadge withEth />
      {extra}
    </div>
  )
}

/** Click/tap explanation (works on touch screens, unlike title=). */
export function InfoHint({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <details className={cn('group inline-block align-middle', className)}>
      <summary className="inline-flex cursor-pointer list-none items-center text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"
        aria-label={`Penjelasan: ${label}`}>
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </summary>
      <span className="mt-1 block max-w-xs rounded-md border bg-popover p-2 text-2xs font-normal leading-snug text-popover-foreground shadow-sm">
        {children}
      </span>
    </details>
  )
}

/** Folded block ("metode dilipat"). */
export function Fold({ title, children, defaultOpen = false, className }: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <details open={defaultOpen} className={cn('group rounded-xl border bg-card', className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t px-4 pb-4 pt-3 sm:px-5">{children}</div>
    </details>
  )
}

/** Assistant slot: for now the automatic explanation the backend already writes. */
export function AssistantBox({ items, context }: { items: string[]; context: string }) {
  return (
    <section className="rounded-xl border border-dashed bg-muted/20 p-4" aria-label={`Asisten: ${context}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <Bot className="h-4 w-4 text-info" aria-hidden="true" />
        Tanya asisten
        <Badge variant="muted" size="xs">SEGERA</Badge>
      </div>
      <p className="mt-1 text-2xs text-muted-foreground">
        Sementara ini berisi ringkasan otomatis dari data di halaman ini · bukan saran investasi.
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
          {items.map((t) => <li key={t}>{t}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Ringkasan tidak tersedia.</p>
      )}
    </section>
  )
}
