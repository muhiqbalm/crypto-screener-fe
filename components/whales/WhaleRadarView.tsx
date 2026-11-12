'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Radar, RefreshCw, Search } from 'lucide-react'
import { PageContainer, PageHeader, SectionHeading } from '@/components/shell/page'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { Panel } from '@/components/ui/hero-card'
import { KpiTile } from '@/components/ui/kpi'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { useIntelWhales } from '@/lib/queries/intel'
import { formatNumber, formatUsdCompact } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { coinHref } from '@/lib/nav'
import { LeanHero } from './LeanHero'
import {
  LEAN_LABEL,
  averageLong,
  isTakerBuy,
  leanOf,
  liveRatios,
  liveTrades,
  whaleAnswer,
  windowPhrase,
} from '@/lib/intel/whales'
import type { TopTraderRatio, WhaleTrade } from '@/lib/api/types/intel'

/** Fields with no data source at all (never sent as numbers); not worth flagging. */
const NEVER_SOURCED = new Set(['whaleVolume24h', 'whaleVolumeChange', 'exchangeNetFlow'])
const MISSING_LABEL: Record<string, string> = {
  topTraderRatios: 'posisi trader besar',
  topTraderBias: 'posisi trader besar',
  smartMoneyStance: 'posisi trader besar',
  whaleTransactions: 'transaksi besar',
  largeTradeNetUsd: 'selisih beli − jual',
}

type SideFilter = 'semua' | 'beli' | 'jual'

function leanDirection(longPct: number): 'long' | 'short' | 'netral' {
  const l = leanOf(longPct)
  return l === 'long' ? 'long' : l === 'short' ? 'short' : 'netral'
}

function RatioCard({ r }: { r: TopTraderRatio }) {
  const coin = r.symbol.replace(/USDT$/, '')
  const lean = leanOf(r.longPct)
  const ratio = r.lsRatio ?? (r.shortPct ? r.longPct / r.shortPct : null)
  return (
    <Panel as="article" interactive className="relative flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        {/* The whole card opens the coin page (stretched link). */}
        <Link
          href={coinHref(r.symbol)}
          className="flex items-center gap-3 after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          <CoinAvatar symbol={coin} />
          <span className="display text-xl font-bold">{coin}</span>
        </Link>
        <DirectionBadge direction={leanDirection(r.longPct)} label={lean ? LEAN_LABEL[lean] : '—'} size="sm" />
      </div>
      <p className="num display text-4xl font-extrabold leading-none">
        <span className="text-bullish">{formatNumber(r.longPct, { digits: 0 })}%</span>
        <span className="ml-2 text-base font-semibold text-muted-foreground">long</span>
      </p>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-bearish/60"
        role="img"
        aria-label={`${coin}: ${formatNumber(r.longPct, { digits: 1 })}% long, ${formatNumber(r.shortPct, { digits: 1 })}% short`}
      >
        <div className="h-full rounded-l-full bg-bullish" style={{ width: `${Math.min(100, Math.max(0, r.longPct))}%` }} />
      </div>
      <p className="num flex items-center justify-between text-2xs text-muted-foreground">
        <span>
          <Term k="long_short_ratio" short noTip /> {ratio === null ? '—' : formatNumber(ratio, { digits: 2 })}
        </span>
        <span>{typeof r.timestamp === 'number' ? formatTime(r.timestamp, { date: false }) : 'waktu tidak tersedia'}</span>
      </p>
    </Panel>
  )
}

/**
 * "1095.2381 SOL" → "1,095.24 SOL": thousands separators, at most 2 decimals from 100 up
 * and 4 below. Text that does not start with a number is shown as it came.
 */
function trimAmount(amount: string): string {
  const m = /^(-?[\d,]+(?:\.\d+)?)\s*(.*)$/.exec(amount.trim())
  if (!m) return amount
  const n = Number(m[1].replace(/,/g, ''))
  if (!Number.isFinite(n)) return amount
  const text = formatNumber(n, { maxDigits: Math.abs(n) >= 100 ? 2 : 4 })
  return m[2] ? `${text} ${m[2]}` : text
}

const TRADE_COLUMNS: ResponsiveColumn<WhaleTrade>[] = [
  {
    key: 'waktu',
    header: 'Waktu',
    mobile: 'field',
    cell: (t) =>
      typeof t.tradeTime === 'number' ? (
        <div className="num whitespace-nowrap text-sm">
          {formatTime(t.tradeTime, { date: false, seconds: true })}
          <div className="text-2xs text-muted-foreground">{formatAge(t.tradeTime, { seconds: true })}</div>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">waktu tidak tersedia</span>
      ),
  },
  {
    key: 'koin',
    header: 'Koin',
    mobile: 'title',
    cell: (t) => (
      <Link href={coinHref(t.symbol)} className="inline-flex items-center gap-2 text-sm font-bold hover:underline">
        <CoinAvatar symbol={t.symbol} size="sm" />
        {t.symbol}
      </Link>
    ),
  },
  { key: 'jumlah', header: 'Jumlah', mobile: 'field', cell: (t) => <span className="num whitespace-nowrap text-sm text-muted-foreground">{trimAmount(t.amount)}</span> },
  {
    key: 'nilai',
    header: 'Nilai',
    align: 'right',
    mobile: 'field',
    cell: (t) => <span className="num whitespace-nowrap text-base font-bold">{typeof t.usdValueRaw === 'number' ? formatUsdCompact(t.usdValueRaw) : t.usdValue}</span>,
  },
  {
    key: 'sisi',
    header: 'Sisi',
    align: 'right',
    mobile: 'badge',
    cell: (t) =>
      isTakerBuy(t) ? (
        <Badge variant="bullish">
          <ArrowUpRight aria-hidden="true" /> Beli
        </Badge>
      ) : (
        <Badge variant="bearish">
          <ArrowDownRight aria-hidden="true" /> Jual
        </Badge>
      ),
  },
]

/** /whales "Arus besar (whale)": where the biggest traders lean, and the latest large taker trades. */
export function WhaleRadarView() {
  const { data: intel, isPending, error, isFetching, refetch } = useIntelWhales()
  const [search, setSearch] = useState('')
  const [side, setSide] = useState<SideFilter>('semua')

  const ratios = liveRatios(intel?.topTraderRatios)
  const trades = liveTrades(intel?.whaleTransactions)
  const status = intel?.status ?? null
  const missing = [...new Set((intel?.unavailableFields ?? []).filter((f) => !NEVER_SOURCED.has(f)).map((f) => MISSING_LABEL[f] ?? f))]
  const minUsd = intel?.largeTradeMinUsd ?? null
  const minLabel = minUsd !== null ? formatUsdCompact(minUsd) : 'tidak diketahui'
  const win = windowPhrase(intel?.largeTradeWindowSeconds)
  const answer = whaleAnswer(intel)
  const avg = averageLong(ratios)
  const coins = [...new Set(trades.map((t) => t.symbol))]
  const cachedAt = typeof intel?.cachedAt === 'number' ? intel.cachedAt : undefined
  const buyUsd = intel?.largeTradeBuyUsd
  const sellUsd = intel?.largeTradeSellUsd
  const flowTotal = (typeof buyUsd === 'number' ? buyUsd : 0) + (typeof sellUsd === 'number' ? sellUsd : 0)
  const buyShare = typeof buyUsd === 'number' && typeof sellUsd === 'number' && flowTotal > 0 ? Math.round((buyUsd / flowTotal) * 100) : null
  const flowHint = win ? `${win} terakhir` : `transaksi ≥ ${minLabel}`

  const term = search.trim().toLowerCase()
  const shown = trades.filter(
    (t) =>
      (side === 'semua' || (side === 'beli' ? isTakerBuy(t) : !isTakerBuy(t))) &&
      (!term || t.symbol.toLowerCase().includes(term) || t.amount.toLowerCase().includes(term)),
  )

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={Radar}
        title="Arus besar (whale)"
        description="Ke mana trader besar condong, dan transaksi besar terbaru."
        help={{
          apaIni:
            'Dua sinyal konteks dari Binance Futures: arah mayoritas posisi akun-akun terbesar (trader besar), dan transaksi besar yang langsung mengambil harga pasar. Bukan perintah beli atau jual.',
          caraPakai: [
            'Baca kalimat di kartu paling atas.',
            'Condong long/short dihitung sama untuk tiap koin dan rata-ratanya: di atas 55% long = condong long, di bawah 45% = condong short.',
            'Transaksi besar hanya mencakup beberapa menit terakhir; lihat jendela waktunya.',
          ],
          istilah: ['top_trader', 'whale_trades', 'net_flow', 'long_short_ratio'],
        }}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden="true" />
            Muat ulang
          </Button>
        }
      />

      {isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} message="Data arus besar belum bisa dimuat." />
      ) : status === 'unavailable' ? (
        <ErrorState
          title="Data Binance sedang tidak bisa diambil"
          message="Tidak ada angka yang ditampilkan daripada angka lama atau karangan."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {status === 'partial' && (
            <p role="status" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-xs text-warn">
              Sebagian data tidak tersedia: {missing.length ? missing.join(', ') : 'sebagian sumber'}.
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
            <LeanHero
              className="lg:col-span-2"
              avgLong={avg}
              lean={answer.lean}
              sentence={answer.sentence.split('. ')[0].replace(/\.?$/, '.')}
              cachedAt={cachedAt}
            />
            <div className="grid gap-5 lg:gap-6">
              <KpiTile
                icon={ArrowUpRight}
                label="Beli besar"
                value={typeof buyUsd === 'number' ? buyUsd : '—'}
                format={(n) => formatUsdCompact(n)}
                tone="bullish"
                toneValue
                size="lg"
                hint={buyShare === null ? flowHint : `${buyShare}% dari nilai · ${flowHint}`}
              />
              <KpiTile
                icon={ArrowDownRight}
                label="Jual besar"
                value={typeof sellUsd === 'number' ? sellUsd : '—'}
                format={(n) => formatUsdCompact(n)}
                tone="bearish"
                toneValue
                size="lg"
                hint={buyShare === null ? flowHint : `${100 - buyShare}% dari nilai · ${flowHint}`}
              />
            </div>
          </div>
          <p className="sr-only">{answer.sentence}</p>

          <section aria-labelledby="per-koin" className="space-y-5">
            <SectionHeading title={<span id="per-koin">Per koin</span>} description="Posisi long vs short akun terbesar (data 5 menit)." />
            {ratios.length === 0 ? (
              <p className="py-6 text-center text-base text-muted-foreground">Posisi trader besar tidak tersedia saat ini.</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {ratios.map((r) => (
                  <RatioCard key={r.symbol} r={r} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="transaksi-besar" className="space-y-5">
            <SectionHeading
              title={
                <span id="transaksi-besar">
                  <Term k="whale_trades" />
                </span>
              }
              description={<>Transaksi ≥ {minLabel}{win ? `, ${win} terakhir` : ''}{coins.length ? ` · ${coins.join(', ')}` : ''}</>}
              actions={
                <Segmented
                  aria-label="Saring sisi transaksi"
                  size="sm"
                  value={side}
                  onChange={(v) => setSide(v as SideFilter)}
                  options={[
                    { value: 'semua', label: 'Semua' },
                    { value: 'beli', label: 'Beli' },
                    { value: 'jual', label: 'Jual' },
                  ]}
                />
              }
            />
            <div className="relative sm:w-64">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Cari koin" placeholder="Cari koin…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-full pl-10 text-sm" />
            </div>
            <ResponsiveTable
              rows={shown}
              columns={TRADE_COLUMNS}
              rowKey={(t) => t.id}
              caption="Transaksi besar terbaru"
              empty={
                <EmptyState
                  title={trades.length ? 'Tidak ada transaksi yang cocok' : `Tidak ada transaksi ≥ ${minLabel} saat ini`}
                  description={trades.length ? 'Ubah saringan atau pencarian.' : 'Dalam jendela terakhir tidak ada transaksi sebesar itu.'}
                />
              }
            />
            <p className="text-2xs text-muted-foreground">Beli/jual = sisi yang mengambil harga pasar (taker), dari 500 transaksi terakhir per koin.</p>
          </section>
        </>
      )}
    </PageContainer>
  )
}
