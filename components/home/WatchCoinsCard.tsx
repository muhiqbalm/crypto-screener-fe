'use client'

import Link from 'next/link'
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { Term } from '@/components/ui/term'
import { Freshness } from '@/components/ui/freshness'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import { cn } from '@/lib/utils/cn'
import { formatPrice, formatRR, formatScore } from '@/lib/utils/format'
import type { ScreenerCoin, WatchCoin, WatchList } from '@/components/home/logic'

function PlanLine({ c }: { c: WatchCoin }) {
  if (c.sl === null && c.tp === null && c.rr === null) return null
  return (
    <p className="num flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      {c.sl !== null && (
        <span>
          Batal jika <span className="text-foreground">{formatPrice(c.sl)}</span>
        </span>
      )}
      {c.tp !== null && (
        <span>
          Target <span className="text-foreground">{formatPrice(c.tp)}</span>
        </span>
      )}
      {c.rr !== null && (
        <span>
          R:R <span className="text-foreground">{formatRR(c.rr)}</span>
        </span>
      )}
    </p>
  )
}

function CoinRow({ c }: { c: WatchCoin }) {
  return (
    <li>
      <Link
        href={c.href}
        className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold">{c.coin}</span>
            <DirectionBadge direction={c.direction} size="xs" />
            {c.keyakinan && <span className="text-xs text-muted-foreground">keyakinan {c.keyakinan}</span>}
            {c.fresh ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-info/35 bg-info/10 px-1.5 text-3xs font-semibold text-info">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                Posisi baru
              </span>
            ) : (
              c.since && <span className="num text-2xs text-muted-foreground">sejak {c.since}</span>
            )}
            {c.peluang && (
              <span
                className={cn(
                  'rounded-full border px-1.5 text-3xs font-semibold',
                  c.peluangPositive ? 'border-bullish/35 bg-bullish/10 text-bullish' : 'border-border text-muted-foreground',
                )}
              >
                {c.peluang}
              </span>
            )}
          </div>
          <PlanLine c={c} />
          {c.reason && <p className="line-clamp-2 text-xs text-muted-foreground">{c.reason}</p>}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  )
}

export interface ScreenerFallback {
  coins: (ScreenerCoin & { track?: string | null })[]
  loading: boolean
}

/**
 * "Koin untuk dipantau" (max 5): Outlook coins with a direction (LONG/SHORT),
 * in the backend's "peluang" order when available. Accounts without Outlook
 * access see the top 3 screener coins instead (no error, no 403 text).
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
  /** Set when the account cannot read the Outlook. */
  fallback: ScreenerFallback | null
}) {
  const all = (
    <Link href="/koin" className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      Semua koin
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  )

  if (fallback) {
    return (
      <Section
        title="Koin untuk dipantau"
        description={
          <>
            3 koin teratas menurut <Term k="screener_score" /> saat ini.
          </>
        }
        action={all}
      >
        {fallback.loading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : fallback.coins.length === 0 ? (
          <p className="text-sm text-muted-foreground">Data screener tidak tersedia saat ini.</p>
        ) : (
          <ul className="-mx-2 divide-y">
            {fallback.coins.map((c) => (
              <li key={c.symbol}>
                <Link
                  href={c.href}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="num w-5 text-xs text-muted-foreground">#{c.rank ?? '–'}</span>
                  <span className="text-sm font-bold">{c.coin}</span>
                  <DirectionBadge direction={c.signal} size="xs" />
                  <span className="num text-xs text-muted-foreground">skor {formatScore(c.score)}</span>
                  {c.track && <span className="hidden text-2xs text-muted-foreground sm:inline">· rekam jejak: {c.track}</span>}
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    )
  }

  return (
    <Section
      title="Koin untuk dipantau"
      description={watch?.ranked ? 'Arah strategi per koin, urut dari peluang terbaik.' : 'Arah strategi per koin: posisi baru dulu, lalu keyakinan.'}
      action={all}
    >
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} compact />
      ) : !watch || watch.coins.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada koin dengan arah LONG/SHORT saat ini; strategi sedang menunggu sinyal baru.
        </p>
      ) : (
        <>
          <ul className="-mx-2 divide-y">
            {watch.coins.map((c) => (
              <CoinRow key={c.symbol} c={c} />
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
            <Freshness dataAt={watch.dataAt ?? undefined} dataLabel="Data close 4H" updatedAt={watch.computedAt ?? undefined} timeframe="4h" />
            {(watch.netral > 0 || watch.moreWithDirection > 0) && (
              <Link href="/koin" className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {[
                  watch.moreWithDirection > 0 ? `${watch.moreWithDirection} koin berarah lain` : null,
                  watch.netral > 0 ? `${watch.netral} koin NETRAL` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                · lihat semua
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </>
      )}
    </Section>
  )
}
