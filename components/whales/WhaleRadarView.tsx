'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Radar, RefreshCw, Search, Users } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Button } from '@/components/ui/button'
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
import { CoinAvatar } from '@/components/bot/kit/CoinAvatar'
import { KpiTile, SectionTitle } from '@/components/bot/kit/Tiles'
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
    <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center justify-between gap-2">
        <Link href={coinHref(r.symbol)} className="flex items-center gap-3 hover:underline">
          <CoinAvatar symbol={coin} size={40} />
          <span className="text-[17px] font-bold">{coin}</span>
        </Link>
        <DirectionBadge direction={leanDirection(r.longPct)} label={lean ? LEAN_LABEL[lean] : '—'} size="sm" />
      </div>
      <p className="num text-[32px] font-bold leading-none tracking-tight">
        <span className="text-bullish">{formatNumber(r.longPct, { digits: 0 })}%</span>
        <span className="ml-2 text-[15px] font-semibold text-muted-foreground">long</span>
      </p>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-bearish/60"
        role="img"
        aria-label={`${coin}: ${formatNumber(r.longPct, { digits: 1 })}% long, ${formatNumber(r.shortPct, { digits: 1 })}% short`}
      >
        <div className="h-full rounded-l-full bg-bullish" style={{ width: `${Math.min(100, Math.max(0, r.longPct))}%` }} />
      </div>
      <p className="num flex items-center justify-between text-[13px] text-muted-foreground">
        <span>
          <Term k="long_short_ratio" short noTip /> {ratio === null ? '—' : formatNumber(ratio, { digits: 2 })}
        </span>
        <span>{typeof r.timestamp === 'number' ? formatTime(r.timestamp, { date: false }) : 'waktu tidak tersedia'}</span>
      </p>
    </div>
  )
}

const TRADE_COLUMNS_BASE: ResponsiveColumn<WhaleTrade>[] = [
  {
    key: 'waktu',
    header: 'Waktu',
    mobile: 'field',
    cell: (t) =>
      typeof t.tradeTime === 'number' ? (
        <div className="num whitespace-nowrap text-[14px]">
          {formatTime(t.tradeTime, { date: false, seconds: true })}
          <div className="text-[13px] text-muted-foreground">{formatAge(t.tradeTime, { seconds: true })}</div>
        </div>
      ) : (
        <span className="text-[14px] text-muted-foreground">waktu tidak tersedia</span>
      ),
  },
  {
    key: 'koin',
    header: 'Koin',
    mobile: 'title',
    cell: (t) => (
      <Link href={coinHref(t.symbol)} className="rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-[13px] font-semibold hover:underline">
        {t.symbol}
      </Link>
    ),
  },
  { key: 'jumlah', header: 'Jumlah', mobile: 'field', cell: (t) => <span className="num whitespace-nowrap text-[14px] text-muted-foreground">{t.amount}</span> },
  {
    key: 'nilai',
    header: 'Nilai',
    align: 'right',
    mobile: 'field',
    cell: (t) => <span className="num whitespace-nowrap text-[14px] font-bold">{typeof t.usdValueRaw === 'number' ? formatUsdCompact(t.usdValueRaw) : t.usdValue}</span>,
  },
  {
    key: 'sisi',
    header: 'Sisi',
    align: 'right',
    mobile: 'badge',
    cell: (t) =>
      isTakerBuy(t) ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-bullish/30 bg-bullish/10 px-2 py-0.5 text-[13px] font-semibold text-bullish">
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> Beli
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-bearish/30 bg-bearish/10 px-2 py-0.5 text-[13px] font-semibold text-bearish">
          <ArrowDownRight className="h-3 w-3" aria-hidden="true" /> Jual
        </span>
      ),
  },
]

/** Deck size: rows at least 52 px. */
const TRADE_COLUMNS: ResponsiveColumn<WhaleTrade>[] = TRADE_COLUMNS_BASE.map((c) => ({ ...c, className: cn('py-3.5', c.className) }))

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
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
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
            <p role="status" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-[14px] text-warn">
              Sebagian data tidak tersedia: {missing.length ? missing.join(', ') : 'sebagian sumber'}.
            </p>
          )}

          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            <LeanHero
              className="lg:col-span-2"
              avgLong={avg}
              lean={answer.lean}
              coins={ratios.map((r) => r.symbol.replace(/USDT$/, ''))}
              sentence={answer.sentence.split('. ').slice(1).join('. ') || answer.sentence}
              cachedAt={cachedAt}
            />
            <div className="flex flex-col gap-5">
              <KpiTile
                icon={ArrowUpRight}
                title="Beli besar"
                value={formatUsdCompact(intel?.largeTradeBuyUsd)}
                tone="ok"
                hint={win ? `${win} terakhir · transaksi ≥ ${minLabel}` : `transaksi ≥ ${minLabel}`}
              />
              <KpiTile
                icon={ArrowDownRight}
                title="Jual besar"
                value={formatUsdCompact(intel?.largeTradeSellUsd)}
                tone="bad"
                hint={win ? `${win} terakhir · transaksi ≥ ${minLabel}` : `transaksi ≥ ${minLabel}`}
              />
            </div>
          </div>
          <p className="sr-only">{answer.sentence}</p>

          <section aria-labelledby="per-koin" className="space-y-5">
            <SectionTitle icon={Users} id="per-koin" title="Per koin" sub="Posisi long vs short akun terbesar (data 5 menit)." />
            {ratios.length === 0 ? (
              <p className="py-6 text-center text-[16px] text-muted-foreground">Posisi trader besar tidak tersedia saat ini.</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {ratios.map((r) => (
                  <RatioCard key={r.symbol} r={r} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="transaksi-besar" className="space-y-5">
            <SectionTitle
              icon={Radar}
              id="transaksi-besar"
              title={<Term k="whale_trades" />}
              sub={<>Transaksi ≥ {minLabel}{win ? `, ${win} terakhir` : ''}{coins.length ? ` · ${coins.join(', ')}` : ''}</>}
              action={
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
              <Input aria-label="Cari koin" placeholder="Cari koin…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-full pl-10 text-[15px]" />
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
            <p className="text-[13px] text-muted-foreground">Beli/jual = sisi yang mengambil harga pasar (taker), dari 500 transaksi terakhir per koin.</p>
          </section>
        </>
      )}
    </PageContainer>
  )
}
