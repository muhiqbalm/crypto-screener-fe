'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Gauge as GaugeIcon, Minus, Users, Waves, Activity, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { Freshness } from '@/components/ui/freshness'
import { Gauge, FNG_GAUGE_ZONES } from '@/components/ui/gauge'
import { IconChip } from '@/components/ui/icon-title'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { TONE_TEXT, type Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'
import type { GlossaryKey } from '@/lib/glossary'
import { formatUsdCompact } from '@/lib/utils/format'
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

function Tile({
  icon,
  tone,
  term,
  label,
  href,
  linkLabel,
  children,
}: {
  icon: LucideIcon
  tone: Tone
  term: GlossaryKey
  label: string
  href: string
  linkLabel: string
  children: React.ReactNode
}) {
  return (
    <li className="flex min-w-[16.5rem] shrink-0 snap-start flex-col gap-3 rounded-3xl border bg-card p-5 sm:min-w-0 sm:shrink">
      <div className="flex items-center gap-2.5">
        <IconChip icon={icon} tone={tone} size="sm" />
        <span className="eyebrow flex items-center">
          <Term k={term}>{label}</Term>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
      <Link
        href={href}
        className="inline-flex w-fit items-center gap-1 rounded-full text-sm font-semibold text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {linkLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </li>
  )
}

const NA = <p className="text-base font-semibold text-muted-foreground">tidak tersedia</p>

function regimeView(word: string | null): { tone: Tone; Icon: LucideIcon } {
  return word === 'Naik'
    ? { tone: 'bullish', Icon: ArrowUpRight }
    : word === 'Turun'
      ? { tone: 'bearish', Icon: ArrowDownRight }
      : { tone: 'muted', Icon: Minus }
}

function CoinRegime({ coin, word, days }: { coin: string; word: string | null; days?: number | null }) {
  const v = regimeView(word)
  return (
    <div className="flex items-center gap-3">
      <CoinAvatar symbol={coin} size="md" />
      <span className="sr-only">{coin}</span>
      {word ? (
        <span className={cn('inline-flex items-center gap-1 text-xl font-extrabold display', TONE_TEXT[v.tone])}>
          <v.Icon className="h-5 w-5" aria-hidden="true" />
          {word}
        </span>
      ) : (
        <span className="text-base text-muted-foreground">tidak tersedia</span>
      )}
      {days ? <span className="ml-auto whitespace-nowrap text-sm text-muted-foreground">{days} hari</span> : null}
    </div>
  )
}

/** Two-colour split bar: left share vs right share, with words (never colour alone). */
function SplitBar({ left, right, leftLabel, rightLabel }: { left: number; right: number; leftLabel: string; rightLabel: string }) {
  const total = left + right
  const pct = total > 0 ? Math.round((left / total) * 100) : 50
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="h-full bg-bullish" style={{ width: `${pct}%` }} />
        <span className="h-full flex-1 bg-bearish" />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {leftLabel} <span className="num font-semibold text-foreground">{pct}%</span>
        </span>
        <span>
          {rightLabel} <span className="num font-semibold text-foreground">{100 - pct}%</span>
        </span>
      </div>
    </div>
  )
}

export interface MarketRibbonProps {
  /** Hide the "Kondisi pasar" title row (e.g. when the page header already says it). */
  compact?: boolean
  className?: string
}

/**
 * Market context strip (team rule: macro + whale context on the first screen,
 * before any coin scores) as four big KPI tiles: BTC/ETH condition · fear &
 * greed gauge · top traders (+ funding) · large trades. Tiles scroll sideways
 * on phones (inside the strip only). Missing data says "tidak tersedia",
 * never a made-up value. Used on Beranda and Peluang koin.
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
  const buy = whales.data?.largeTradeBuyUsd
  const sell = whales.data?.largeTradeSellUsd

  return (
    <section aria-label="Kondisi pasar" className={cn('space-y-4', className)}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="display flex items-center gap-2.5 text-xl font-bold">
            <Activity className="h-5 w-5 text-brand" aria-hidden="true" />
            Kondisi pasar
          </h2>
          <Freshness updatedAt={updated ?? undefined} />
        </div>
      )}
      <p className="sr-only">{ribbonSentence({ btc, eth, fg, stance, flow })}</p>
      <ul
        className="relative -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4"
        aria-label="Indikator pasar"
      >
        <Tile icon={Activity} tone="brand" term="regime" label="Kondisi pasar" href="/chart?symbol=BTCUSDT" linkLabel="Lihat chart">
          {regime.isPending ? (
            <>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </>
          ) : (
            <>
              <CoinRegime coin="BTC" word={btc} days={regime.data?.btc?.days_in_label} />
              <CoinRegime coin="ETH" word={eth} days={regime.data?.eth?.days_in_label} />
            </>
          )}
        </Tile>

        <Tile icon={GaugeIcon} tone="warn" term="fear_greed" label="Takut–serakah" href="/news" linkLabel="Lihat berita">
          {news.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : fg ? (
            <div className="flex items-center gap-4">
              <Gauge value={fg.value} zones={FNG_GAUGE_ZONES} size={112} thickness={11} label={`Indeks takut–serakah ${fg.value} dari 100, ${fg.zone}`} />
              <div className="min-w-0">
                <p className="num display text-4xl font-extrabold leading-none">{fg.value}</p>
                <p className="mt-1 text-base font-semibold capitalize text-muted-foreground">{fg.zone}</p>
              </div>
            </div>
          ) : (
            NA
          )}
        </Tile>

        <Tile icon={Users} tone="lab" term="top_trader" label="Trader besar" href="/whales" linkLabel="Lihat arus besar">
          {whales.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : stance ? (
            <>
              <p className={cn('display text-2xl font-extrabold leading-tight', stance.side === 'long' ? 'text-bullish' : stance.side === 'short' ? 'text-bearish' : 'text-foreground')}>
                {stance.side === 'netral' ? 'Seimbang' : `Condong ${stance.side}`}
              </p>
              <SplitBar left={stance.longPct} right={100 - stance.longPct} leftLabel="Long" rightLabel="Short" />
              {funding && (
                <p className="text-sm text-muted-foreground">
                  Funding <span className="num font-semibold text-foreground">{funding.text}</span> · {funding.payer}
                </p>
              )}
            </>
          ) : (
            NA
          )}
        </Tile>

        <Tile icon={Waves} tone="info" term="net_flow" label="Transaksi besar" href="/whales" linkLabel="Lihat arus besar">
          {whales.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : flow ? (
            <>
              <p className={cn('num display text-3xl font-extrabold leading-none', flow.net > 0 ? 'text-bullish' : flow.net < 0 ? 'text-bearish' : 'text-foreground')}>
                {formatUsdCompact(flow.net, { signed: true })}
              </p>
              <p className="text-sm text-muted-foreground">
                {flow.word}
                {flow.window ? ` · ${flow.window} terakhir` : ''}
              </p>
              {typeof buy === 'number' && typeof sell === 'number' && buy + sell > 0 && (
                <SplitBar left={buy} right={sell} leftLabel="Beli" rightLabel="Jual" />
              )}
            </>
          ) : (
            NA
          )}
        </Tile>
      </ul>
    </section>
  )
}
