'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Radar, RefreshCw, Search, Users } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { AnswerCard } from '@/components/ui/answer-card'
import { Button } from '@/components/ui/button'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { Freshness } from '@/components/ui/freshness'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { useIntelWhales } from '@/lib/queries/intel'
import { formatNumber, formatUsdCompact } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import {
  LEAN_LABEL,
  averageLong,
  coinPath,
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
    <div className="space-y-2.5 rounded-xl border bg-background/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <Link href={coinPath(r.symbol)} className="font-mono text-sm font-bold hover:underline">
          {coin}
        </Link>
        <DirectionBadge direction={leanDirection(r.longPct)} label={lean ? LEAN_LABEL[lean] : '—'} size="xs" />
      </div>
      <div className="num flex justify-between text-xs">
        <span>
          Long <b className="text-bullish">{formatNumber(r.longPct, { digits: 1 })}%</b>
        </span>
        <span>
          Short <b className="text-bearish">{formatNumber(r.shortPct, { digits: 1 })}%</b>
        </span>
      </div>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-bearish/30"
        role="img"
        aria-label={`${coin}: ${formatNumber(r.longPct, { digits: 1 })}% long, ${formatNumber(r.shortPct, { digits: 1 })}% short`}
      >
        <div className="h-full bg-bullish" style={{ width: `${Math.min(100, Math.max(0, r.longPct))}%` }} />
      </div>
      <div className="num flex items-center justify-between border-t border-border/40 pt-1.5 text-2xs text-muted-foreground">
        <span>
          <Term k="long_short_ratio" short noTip /> {ratio === null ? '—' : formatNumber(ratio, { digits: 2 })}
        </span>
        <span>{typeof r.timestamp === 'number' ? formatTime(r.timestamp, { date: false }) : 'waktu tidak tersedia'}</span>
      </div>
    </div>
  )
}

const TRADE_COLUMNS: ResponsiveColumn<WhaleTrade>[] = [
  {
    key: 'waktu',
    header: 'Waktu',
    mobile: 'field',
    cell: (t) =>
      typeof t.tradeTime === 'number' ? (
        <div className="num whitespace-nowrap text-xs">
          {formatTime(t.tradeTime, { date: false, seconds: true })}
          <div className="text-3xs text-muted-foreground">{formatAge(t.tradeTime, { seconds: true })}</div>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">waktu tidak tersedia</span>
      ),
  },
  {
    key: 'koin',
    header: 'Koin',
    mobile: 'title',
    cell: (t) => (
      <Link href={coinPath(t.symbol)} className="rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-2xs font-semibold hover:underline">
        {t.symbol}
      </Link>
    ),
  },
  { key: 'jumlah', header: 'Jumlah', mobile: 'field', cell: (t) => <span className="num whitespace-nowrap text-xs text-muted-foreground">{t.amount}</span> },
  {
    key: 'nilai',
    header: 'Nilai',
    align: 'right',
    mobile: 'field',
    cell: (t) => <span className="num whitespace-nowrap text-xs font-bold">{typeof t.usdValueRaw === 'number' ? formatUsdCompact(t.usdValueRaw) : t.usdValue}</span>,
  },
  {
    key: 'sisi',
    header: 'Sisi',
    align: 'right',
    mobile: 'badge',
    cell: (t) =>
      isTakerBuy(t) ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-bullish/30 bg-bullish/10 px-2 py-0.5 text-2xs font-semibold text-bullish">
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> Beli
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-bearish/30 bg-bearish/10 px-2 py-0.5 text-2xs font-semibold text-bearish">
          <ArrowDownRight className="h-3 w-3" aria-hidden="true" /> Jual
        </span>
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
        description="Ke mana trader besar condong, dan transaksi besar terbaru di Binance Futures."
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
          <AnswerCard
            tone="info"
            title="Trader besar condong ke mana?"
            answer={answer.sentence}
            metrics={[
              {
                label: <Term k="top_trader" noTip />,
                value: answer.lean && avg !== null ? `${LEAN_LABEL[answer.lean]} · ${formatNumber(avg, { digits: 0 })}% long` : 'tidak tersedia',
                valueClassName: answer.lean === 'long' ? 'text-bullish' : answer.lean === 'short' ? 'text-bearish' : undefined,
              },
              { label: 'Beli besar', value: formatUsdCompact(intel?.largeTradeBuyUsd), hint: win ? `${win} terakhir` : undefined },
              { label: 'Jual besar', value: formatUsdCompact(intel?.largeTradeSellUsd), hint: win ? `${win} terakhir` : undefined },
            ]}
            footer={<Freshness updatedAt={cachedAt} />}
          />

          {status === 'partial' && (
            <p role="status" className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn">
              Sebagian data tidak tersedia: {missing.length ? missing.join(', ') : 'sebagian sumber'}. Bagian itu ditulis &quot;tidak tersedia&quot;.
            </p>
          )}

          <Section
            icon={<Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            title={<Term k="top_trader" />}
            description="Persentase posisi long vs short di akun-akun terbesar Binance Futures, per koin (data 5 menit)."
          >
            {ratios.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Posisi trader besar tidak tersedia saat ini.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ratios.map((r) => (
                  <RatioCard key={r.symbol} r={r} />
                ))}
              </div>
            )}
          </Section>

          <Section
            icon={<Radar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            title={<Term k="whale_trades" />}
            description={
              <>
                Transaksi ≥ {minLabel} yang langsung mengambil harga pasar, dari 500 transaksi terakhir per koin
                {coins.length ? ` (${coins.join(', ')})` : ''}
                {win ? `, mencakup ${win} terakhir` : ''}.
              </>
            }
            action={
              <Segmented
                aria-label="Saring sisi transaksi"
                size="xs"
                value={side}
                onChange={(v) => setSide(v as SideFilter)}
                options={[
                  { value: 'semua', label: 'Semua' },
                  { value: 'beli', label: 'Beli' },
                  { value: 'jual', label: 'Jual' },
                ]}
              />
            }
          >
            <div className="space-y-3">
              <div className="relative sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <Input aria-label="Cari koin" placeholder="Cari koin…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-xs" />
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
              <p className="text-3xs text-muted-foreground">
                Beli/jual = sisi yang mengambil harga pasar (taker). Sumber: Binance USDT perpetual, diambil server tiap ±60 detik.
              </p>
            </div>
          </Section>
        </>
      )}
    </PageContainer>
  )
}
