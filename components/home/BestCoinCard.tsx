'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Target } from 'lucide-react'
import { HeroCard } from '@/components/ui/hero-card'
import { IconTitle } from '@/components/ui/icon-title'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { ConfidenceDots } from '@/components/ui/confidence-dots'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { CountUp } from '@/components/ui/count-up'
import { ErrorState } from '@/components/shell/states'
import { cn } from '@/lib/utils/cn'
import { formatPrice, formatRR, formatScore, formatUsd, formatUsdSigned } from '@/lib/utils/format'
import { termLabel } from '@/lib/glossary'
import { GradeLetter } from '@/components/market/quality/GradeLetter'
import { GRADE_LABEL } from '@/lib/lab/quality'
import type { ScreenerCoin, WatchCoin } from '@/components/home/logic'

function AllLink() {
  return (
    <Link
      href="/koin"
      className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Semua koin
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

function Money({ label, value, tone }: { label: React.ReactNode; value: number | null; tone: 'bullish' | 'bearish' }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className={cn('num display whitespace-nowrap text-2xl font-extrabold', value === null ? 'text-muted-foreground' : tone === 'bullish' ? 'text-bullish' : 'text-bearish')}>
        {value === null ? '—' : formatUsdSigned(value)}
      </p>
    </div>
  )
}

/**
 * "Peluang terbaik" hero (span 2): the one coin worth a look, its direction,
 * keyakinan, R:R and the dollars at target / stop for the default capital.
 * Only a call with positive evidence is called "terbaik" (CEO decision K8).
 * Accounts without Outlook access see the top screener coin instead.
 */
export function BestCoinCard({
  best,
  loading,
  error,
  onRetry,
  screenerTop,
}: {
  best: { coin: WatchCoin; basis: 'positif' | 'teratas' } | null
  loading: boolean
  error: unknown
  onRetry: () => void
  /** Set when the account cannot read the Outlook. */
  screenerTop?: (ScreenerCoin & { track?: string | null }) | null
}) {
  const c = best?.coin
  const glow = c ? (c.direction === 'LONG' ? 'bullish' : 'bearish') : 'brand'
  return (
    <HeroCard span={2} glow={glow} aria-labelledby="best-title" className="flex flex-col gap-5 xl:col-span-3">
      <IconTitle
        icon={Target}
        tone="brand"
        title={<span id="best-title">{screenerTop !== undefined ? 'Koin teratas' : best?.basis === 'teratas' ? 'Koin teratas' : 'Peluang terbaik'}</span>}
        action={<AllLink />}
      />

      {screenerTop !== undefined ? (
        loading ? (
          <Skeleton className="h-28 w-full" />
        ) : screenerTop ? (
          <Link href={screenerTop.href} className="group flex flex-wrap items-center gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <CoinAvatar symbol={screenerTop.symbol} size="lg" />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="display text-4xl font-extrabold">{screenerTop.coin}</span>
                <DirectionBadge direction={screenerTop.signal} size="md" />
              </div>
              <p className="text-base text-muted-foreground">
                <Term k="screener_score">Skor screener</Term> <span className="num font-semibold text-foreground">{formatScore(screenerTop.score)}</span>
                {screenerTop.track ? ` · rekam jejak: ${screenerTop.track.toLowerCase()}` : ''}
              </p>
            </div>
          </Link>
        ) : (
          <p className="text-base text-muted-foreground">Data screener tidak tersedia saat ini.</p>
        )
      ) : loading ? (
        <Skeleton className="h-36 w-full" />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} compact className="py-2" />
      ) : c ? (
        <>
          <Link href={c.href} className="group flex flex-wrap items-center gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <CoinAvatar symbol={c.symbol} size="lg" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="display text-4xl font-extrabold leading-none sm:text-5xl">{c.coin}</span>
                <DirectionBadge direction={c.direction} size="md" />
                {c.fresh && (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-info/15 px-3 text-sm font-bold text-info">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Posisi baru
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {c.keyakinan && <ConfidenceDots level={c.keyakinan} />}
                {c.grade ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <GradeLetter grade={c.grade} size="xs" decorative />Skor {c.grade} · {GRADE_LABEL[c.grade].toLowerCase()}
                  </span>
                ) : c.peluang && <span className={cn('font-semibold', c.peluangPositive && 'text-bullish')}>{c.peluang}</span>}
              </div>
            </div>
          </Link>
          {/* Phones: R:R on its own row, the two dollar numbers side by side, so nothing is cut (audit P3). */}
          <div className="grid grid-cols-2 items-end gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-3">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className="eyebrow">
                <Term k="rr" />
              </p>
              <p className="num display text-glow whitespace-nowrap text-2xl font-extrabold text-brand">
                {c.rr === null ? '—' : <CountUp value={c.rr} format={(n) => formatRR(n)} />}
              </p>
            </div>
            <Money label={termLabel('money_at_tp')} value={c.tpUsd} tone="bullish" />
            <Money label={termLabel('money_at_sl')} value={c.slUsd} tone="bearish" />
          </div>
          <p className="num text-sm text-muted-foreground">
            {[c.sl !== null ? `Batal jika ${formatPrice(c.sl)}` : null, c.tp !== null ? `Target ${formatPrice(c.tp)}` : null, c.capital ? `modal ${formatUsd(c.capital)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand">
            <Target className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="display text-xl font-bold">Belum ada peluang dengan bukti positif</p>
            <p className="text-base text-muted-foreground">Strategi menunggu sinyal baru. Cek lagi setelah close 4H berikutnya.</p>
          </div>
        </div>
      )}
    </HeroCard>
  )
}
