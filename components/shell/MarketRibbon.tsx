'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { Freshness } from '@/components/ui/freshness'
import { cn } from '@/lib/utils/cn'
import type { GlossaryKey } from '@/lib/glossary'
import { useRibbonNews, useRibbonRegime, useRibbonScreener, useRibbonWhales } from '@/lib/queries/market-ribbon'
import {
  fearGreed,
  fundingInfo,
  largeFlow,
  newestCachedAt,
  regimeWord,
  ribbonSentence,
  traderStance,
} from '@/components/shell/market-ribbon-logic'

type Tone = 'up' | 'down' | 'flat' | 'neutral' | 'none'

const TONE: Record<Tone, { cls: string; Icon: LucideIcon | null }> = {
  up: { cls: 'text-bullish', Icon: ArrowUpRight },
  down: { cls: 'text-bearish', Icon: ArrowDownRight },
  flat: { cls: 'text-muted-foreground', Icon: Minus },
  neutral: { cls: 'text-foreground', Icon: null },
  none: { cls: 'text-muted-foreground', Icon: null },
}

function Chip({
  term,
  label,
  value,
  sub,
  tone,
  href,
  loading,
}: {
  term?: GlossaryKey
  label: string
  value: string | null
  sub?: string | null
  tone: Tone
  href: string
  loading: boolean
}) {
  const t = TONE[value === null ? 'none' : tone]
  return (
    <li className="flex min-w-[9.5rem] shrink-0 snap-start flex-col gap-0.5 rounded-lg border bg-background/60 px-3 py-2 sm:min-w-0 sm:shrink">
      <span className="flex items-center text-3xs font-semibold uppercase tracking-wide text-muted-foreground">
        {term ? <Term k={term} short>{label}</Term> : label}
      </span>
      {loading ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <Link
          href={href}
          className={cn(
            'inline-flex min-w-0 items-center gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            t.cls,
          )}
        >
          {t.Icon && <t.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate">{value ?? 'tidak tersedia'}</span>
        </Link>
      )}
      {!loading && sub && <span className="num truncate text-2xs text-muted-foreground">{sub}</span>}
    </li>
  )
}

function regimeTone(word: string | null): Tone {
  return word === 'Naik' ? 'up' : word === 'Turun' ? 'down' : 'flat'
}

export interface MarketRibbonProps {
  /** Hide the "Kondisi pasar" title row (e.g. when the page header already says it). */
  compact?: boolean
  className?: string
}

/**
 * Market context strip (team rule: macro + whale context on the first screen,
 * before any coin scores): BTC/ETH condition · fear & greed · top traders ·
 * large trades · average funding. Chips scroll sideways on phones (inside the
 * strip only). Missing data says "tidak tersedia", never a made-up value.
 * Used on Beranda and Peluang koin.
 */
export function MarketRibbon({ compact, className }: MarketRibbonProps) {
  const regime = useRibbonRegime()
  const news = useRibbonNews()
  const whales = useRibbonWhales()
  const screener = useRibbonScreener()

  const btc = regimeWord(regime.data?.btc)
  const eth = regimeWord(regime.data?.eth)
  const fg = fearGreed(news.data)
  const stance = traderStance(whales.data)
  const flow = largeFlow(whales.data)
  const funding = fundingInfo(screener.data?.summary?.market_overview?.avg_funding_rate)
  const updated = newestCachedAt(news.data?.cachedAt, whales.data?.cachedAt)

  const sentence = ribbonSentence({ btc, eth, fg, stance, flow })

  return (
    <section aria-label="Kondisi pasar" className={cn('rounded-xl border bg-card p-3 shadow-xs sm:p-4', className)}>
      {!compact && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold">Kondisi pasar</h2>
          <Freshness updatedAt={updated ?? undefined} />
        </div>
      )}
      <p className="sr-only">{sentence}</p>
      <ul
        className="relative -mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6"
        aria-label="Indikator pasar"
      >
        <Chip
          term="regime"
          label="BTC"
          value={btc}
          sub={regime.data?.btc?.days_in_label ? `${regime.data.btc.days_in_label} hari` : null}
          tone={regimeTone(btc)}
          href="/chart?symbol=BTCUSDT"
          loading={regime.isPending}
        />
        <Chip
          term="regime"
          label="ETH"
          value={eth}
          sub={regime.data?.eth?.days_in_label ? `${regime.data.eth.days_in_label} hari` : null}
          tone={regimeTone(eth)}
          href="/chart?symbol=ETHUSDT"
          loading={regime.isPending}
        />
        <Chip
          term="fear_greed"
          label="Takut–serakah"
          value={fg ? `${fg.value} · ${fg.zone}` : null}
          tone="neutral"
          href="/news"
          loading={news.isPending}
        />
        <Chip
          term="top_trader"
          label="Trader besar"
          value={stance?.text ?? null}
          tone={stance?.side === 'long' ? 'up' : stance?.side === 'short' ? 'down' : 'flat'}
          href="/whales"
          loading={whales.isPending}
        />
        <Chip
          term="net_flow"
          label="Transaksi besar"
          value={flow?.word ?? null}
          sub={flow ? [flow.amount, flow.window && `${flow.window} terakhir`].filter(Boolean).join(' · ') : null}
          tone={flow ? (flow.net > 0 ? 'up' : flow.net < 0 ? 'down' : 'flat') : 'none'}
          href="/whales"
          loading={whales.isPending}
        />
        <Chip
          term="funding"
          label="Funding rata-rata"
          value={funding?.text ?? null}
          sub={funding?.payer ?? null}
          tone="neutral"
          href="/koin?view=faktor"
          loading={screener.isPending}
        />
      </ul>
    </section>
  )
}
