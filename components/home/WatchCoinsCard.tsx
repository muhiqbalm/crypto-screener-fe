'use client'

import Link from 'next/link'
import { ArrowRight, ChevronRight, Compass, Sparkles } from 'lucide-react'
import { Panel } from '@/components/ui/hero-card'
import { IconTitle } from '@/components/ui/icon-title'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { ConfidenceDots } from '@/components/ui/confidence-dots'
import { Freshness } from '@/components/ui/freshness'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import { formatPrice, formatRR, formatScore } from '@/lib/utils/format'
import type { ScreenerCoin, WatchCoin, WatchList } from '@/components/home/logic'

function CoinRow({ c }: { c: WatchCoin }) {
  return (
    <li>
      <Link
        href={c.href}
        className="group flex min-h-[64px] items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CoinAvatar symbol={c.symbol} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">{c.coin}</span>
            <DirectionBadge direction={c.direction} size="xs" />
            {c.fresh && (
              <span className="inline-flex h-5 items-center gap-1 rounded-full bg-info/15 px-2 text-3xs font-bold uppercase tracking-wide text-info">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Baru
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {c.keyakinan && <ConfidenceDots level={c.keyakinan} />}
            {c.tp !== null && <span className="num hidden sm:inline">TP {formatPrice(c.tp)}</span>}
          </div>
        </div>
        {c.rr !== null && (
          <div className="text-right">
            <p className="num display text-lg font-extrabold leading-none">{formatRR(c.rr)}</p>
            <p className="eyebrow mt-1">R:R</p>
          </div>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  )
}

export interface ScreenerFallback {
  coins: (ScreenerCoin & { track?: string | null })[]
  loading: boolean
}

/**
 * "Koin dipantau": up to 5 coins with a direction, few words: avatar, coin,
 * direction, keyakinan dots, R:R. Accounts without Outlook access see the
 * top 3 screener coins instead (no error, no 403 text).
 */
export function WatchCoinsCard({
  watch,
  loading,
  error,
  onRetry,
  fallback,
}: {
  watch: WatchList | null
  loading: boolean
  error: unknown
  onRetry: () => void
  fallback: ScreenerFallback | null
}) {
  const all = (
    <Link href="/koin" className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      Semua koin
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
  const skeleton = (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )

  return (
    <Panel aria-labelledby="koin-title" className="flex flex-col gap-4">
      <IconTitle icon={Compass} tone="brand" title={<span id="koin-title">Koin dipantau</span>} action={all} />
      {fallback ? (
        fallback.loading ? (
          skeleton
        ) : fallback.coins.length === 0 ? (
          <p className="text-base text-muted-foreground">Data screener tidak tersedia saat ini.</p>
        ) : (
          <ul className="-mx-2 space-y-1">
            {fallback.coins.map((c) => (
              <li key={c.symbol}>
                <Link
                  href={c.href}
                  className="group flex min-h-[64px] items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CoinAvatar symbol={c.symbol} />
                  <span className="text-base font-bold">{c.coin}</span>
                  <DirectionBadge direction={c.signal} size="xs" />
                  <span className="num ml-auto text-sm text-muted-foreground">skor {formatScore(c.score)}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : loading ? (
        skeleton
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} compact />
      ) : !watch || watch.coins.length === 0 ? (
        <p className="text-base text-muted-foreground">Belum ada koin dengan arah LONG/SHORT. Strategi menunggu sinyal baru.</p>
      ) : (
        <>
          <ul className="-mx-2 space-y-1">
            {watch.coins.map((c) => (
              <CoinRow key={c.symbol} c={c} />
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <Freshness dataAt={watch.dataAt ?? undefined} dataLabel="Close 4H" timeframe="4h" />
            {watch.netral > 0 && <span className="text-sm text-muted-foreground">{watch.netral} koin NETRAL</span>}
          </div>
        </>
      )}
    </Panel>
  )
}
