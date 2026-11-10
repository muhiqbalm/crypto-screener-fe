'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { useIntelWhales } from '@/lib/queries/intel'
import { cn } from '@/lib/utils/cn'
import { ApiError } from '@/lib/api/errors'
import type { TopTraderRatio, WhaleTrade } from '@/lib/api/types/intel'
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  RefreshCw,
  TrendingUp,
  Layers,
  CircleDollarSign,
  Radar,
  Activity,
} from 'lucide-react'

/**
 * Zero Static Mocking: only live values from /api/v1/intel/whales are shown.
 * The backend returns null + lists `unavailableFields` for anything it cannot
 * source (whaleVolume24h / whaleVolumeChange / exchangeNetFlow have no source
 * and are never rendered). The filters below are defensive guards against
 * older backend builds that still sent static placeholder rows.
 */
function liveRatios(ratios: TopTraderRatio[] | undefined): TopTraderRatio[] {
  return (ratios ?? []).filter((r) => r.updated !== 'Cached')
}

function liveTrades(trades: WhaleTrade[] | undefined): WhaleTrade[] {
  return (trades ?? []).filter((t) => t.id.startsWith('tx-fapi-'))
}

function formatUsdCompact(v: number | null | undefined, signed = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const sign = v < 0 ? '-' : signed && v > 0 ? '+' : ''
  const a = Math.abs(v)
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`
  return `${sign}$${a.toFixed(0)}`
}

function formatWindow(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return null
  if (seconds < 120) return `${Math.round(seconds)}s`
  return `${Math.round(seconds / 60)}m`
}

// `side` is authoritative; legacy payloads only had type ("outflow" = taker buy).
function isTakerBuy(tx: WhaleTrade): boolean {
  return tx.side ? tx.side === 'BUY' : tx.type === 'outflow'
}

const STANCE_CLASS: Record<string, string> = {
  bullish: 'text-bullish',
  bearish: 'text-bearish',
  neutral: 'text-muted-foreground',
}

// Fields with no data source at all; not worth flagging on every snapshot.
const NEVER_SOURCED = new Set(['whaleVolume24h', 'whaleVolumeChange', 'exchangeNetFlow'])

export function WhaleRadarView() {
  const { data: intel, isPending, error, isFetching, refetch } = useIntelWhales()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all')

  const ratios = liveRatios(intel?.topTraderRatios)
  const transactions = liveTrades(intel?.whaleTransactions)

  const status = intel?.status ?? null
  const missing = (intel?.unavailableFields ?? []).filter((f) => !NEVER_SOURCED.has(f))
  const windowLabel = formatWindow(intel?.largeTradeWindowSeconds)
  const minUsd = intel?.largeTradeMinUsd ?? null
  const minUsdLabel = minUsd !== null ? formatUsdCompact(minUsd) : '$50K'
  const netUsd = intel?.largeTradeNetUsd ?? null
  const stanceCode = intel?.smartMoneyStanceCode ?? null
  const snapshotTime =
    typeof intel?.cachedAt === 'number'
      ? new Date(intel.cachedAt * 1000).toLocaleTimeString()
      : null

  const term = searchTerm.toLowerCase()
  const filteredTxs = transactions.filter((tx) => {
    const matchesSearch =
      tx.symbol.toLowerCase().includes(term) || tx.amount.toLowerCase().includes(term)
    const matchesType =
      filterType === 'all' || (filterType === 'buy' ? isTakerBuy(tx) : !isTakerBuy(tx))
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/40 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-info/10 border border-info/20 text-info text-xs font-mono font-medium shadow-sm">
            <Radar className="h-3.5 w-3.5 text-info" />
            WHALE RADAR
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Whale Radar &amp; Top Trader Positioning
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Binance Futures top-trader long/short ratios and large BTC / ETH / SOL perpetual
            trades (≥ {minUsdLabel}) from the most recent aggregated trades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {snapshotTime && (
            <Badge variant="outline" className="border-border/80 px-3 py-1.5 font-mono text-xs">
              Snapshot {snapshotTime}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 cursor-pointer h-9 px-3.5 border-border/80 hover:bg-muted/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-bullish' : ''}`} />
            Refresh Radar
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorPanel
          kind={error instanceof ApiError ? error.kind : 'server'}
          onRetry={() => refetch()}
          messageOverride="Whale radar data is unavailable right now."
        />
      ) : status === 'unavailable' ? (
        <ErrorPanel
          kind="server"
          onRetry={() => refetch()}
          messageOverride="Binance whale data is unavailable right now (upstream fetch failed). No numbers are shown rather than stale or invented ones."
        />
      ) : (
        <>
          {status === 'partial' && (
            <div
              role="status"
              className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn"
            >
              Partial snapshot — unavailable: {missing.length > 0 ? missing.join(', ') : 'some sources'}.
            </div>
          )}

          {/* Overview Stat Cards — all values come from live data in this response */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Large Taker Buys"
              icon={<CircleDollarSign className="h-4 w-4 text-bullish" />}
              value={formatUsdCompact(intel?.largeTradeBuyUsd)}
              valueClass="text-bullish"
              caption={windowLabel ? `Trades ≥ ${minUsdLabel}, last ${windowLabel}` : `Trades ≥ ${minUsdLabel}`}
            />
            <StatCard
              title="Large Taker Sells"
              icon={<Layers className="h-4 w-4 text-bearish" />}
              value={formatUsdCompact(intel?.largeTradeSellUsd)}
              valueClass="text-bearish"
              caption={windowLabel ? `Trades ≥ ${minUsdLabel}, last ${windowLabel}` : `Trades ≥ ${minUsdLabel}`}
            />
            <StatCard
              title="Large Trade Net Flow"
              icon={<Activity className="h-4 w-4 text-info" />}
              value={formatUsdCompact(netUsd, true)}
              valueClass={
                netUsd === null ? undefined : netUsd >= 0 ? 'text-bullish' : 'text-bearish'
              }
              caption="Taker buys minus taker sells (BTC/ETH/SOL perps)"
            />
            <StatCard
              title="Top Trader Stance"
              icon={<TrendingUp className="h-4 w-4 text-bullish" />}
              value={intel?.smartMoneyStance ?? '—'}
              valueClass={`text-base ${stanceCode ? STANCE_CLASS[stanceCode] : 'text-muted-foreground'}`}
              caption={
                intel?.topTraderBias
                  ? `${intel.topTraderBias} avg across ${ratios.length} symbol${ratios.length === 1 ? '' : 's'}`
                  : 'No live ratio data'
              }
            />
          </div>

          {/* Binance Top Trader Long/Short Ratio Matrix */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-md overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                Binance Top Trader Long / Short Ratio
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Binance Futures topLongShortPositionRatio (5m period).
              </p>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {ratios.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Live long/short ratio data is unavailable right now.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ratios.map((item) => {
                    const isBullish = item.longPct >= 50
                    return (
                      <div
                        key={item.symbol}
                        className="p-4 rounded-xl border border-border/60 bg-background/60 hover:border-border transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-foreground tracking-wide">{item.symbol}</span>
                          <Badge
                            className={`text-3xs font-mono font-semibold px-2 py-0.5 ${
                              isBullish
                                ? 'bg-bullish/15 text-bullish border border-bullish/30'
                                : 'bg-bearish/15 text-bearish border border-bearish/30'
                            }`}
                          >
                            {isBullish ? 'Long Skew' : 'Short Skew'}
                          </Badge>
                        </div>

                        <div className="flex justify-between text-xs font-mono font-medium">
                          <span className="text-bullish">Long: {item.longPct}%</span>
                          <span className="text-bearish">Short: {item.shortPct}%</span>
                        </div>

                        <div className="w-full h-2 bg-bearish/30 rounded-full overflow-hidden flex">
                          <div
                            className="bg-bullish h-full transition-all duration-500 rounded-l-full"
                            style={{ width: `${item.longPct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-2xs text-muted-foreground font-mono pt-1 border-t border-border/30">
                          <span>
                            L/S Ratio:{' '}
                            <strong className="text-foreground">
                              {item.lsRatio ?? (item.shortPct ? (item.longPct / item.shortPct).toFixed(2) : '—')}
                            </strong>
                          </span>
                          <span>
                            {typeof item.timestamp === 'number'
                              ? new Date(item.timestamp).toLocaleTimeString()
                              : item.updated}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Large trade stream */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-md overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                  Large Perpetual Trades
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Binance USDT-M BTC / ETH / SOL perpetual aggregated trades with notional ≥ {minUsdLabel}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-52">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search token…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs bg-background/60 border-border/80 focus-visible:ring-1"
                  />
                </div>
                <div className="flex items-center gap-1 border border-border/80 rounded-lg p-1 bg-background/60">
                  {(
                    [
                      ['all', 'All'],
                      ['buy', 'Taker Buy'],
                      ['sell', 'Taker Sell'],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={filterType === key ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType(key)}
                      className="h-7 text-xs px-3 font-medium cursor-pointer"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No trades ≥ {minUsdLabel} in the latest Binance snapshot.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-2xs font-mono uppercase text-left">
                        <th className="py-3 px-5 font-semibold">Time</th>
                        <th className="py-3 px-5 font-semibold">Asset</th>
                        <th className="py-3 px-5 font-semibold">Size</th>
                        <th className="py-3 px-5 font-semibold text-right">Notional</th>
                        <th className="py-3 px-5 font-semibold text-right">Taker Side</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td
                            className="py-3.5 px-5 font-mono text-muted-foreground whitespace-nowrap"
                            title={typeof tx.tradeTime === 'number' ? new Date(tx.tradeTime).toLocaleString() : undefined}
                          >
                            {tx.timestamp ?? '—'}
                          </td>
                          <td className="py-3.5 px-5 font-mono">
                            <span className="px-2 py-0.5 rounded-md bg-muted/70 text-2xs font-semibold border border-border/50">
                              {tx.symbol}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-muted-foreground whitespace-nowrap">{tx.amount}</td>
                          <td className="py-3.5 px-5 font-mono text-right font-bold text-foreground whitespace-nowrap">
                            {tx.usdValue}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {isTakerBuy(tx) ? (
                              <Badge className="bg-bullish/15 text-bullish border border-bullish/30 text-2xs gap-1 font-mono py-1 px-2.5">
                                <ArrowUpRight className="h-3 w-3" /> Buy
                              </Badge>
                            ) : (
                              <Badge className="bg-bearish/15 text-bearish border border-bearish/30 text-2xs gap-1 font-mono py-1 px-2.5">
                                <ArrowDownRight className="h-3 w-3" /> Sell
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredTxs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No trades match your filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  title,
  icon,
  value,
  caption,
  valueClass,
}: {
  title: string
  icon: React.ReactNode
  value: string
  caption: string
  valueClass?: string
}) {
  return (
    <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
        <CardTitle className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-1">
        <div className={cn('text-2xl font-bold font-mono tracking-tight text-foreground', valueClass)}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{caption}</p>
      </CardContent>
    </Card>
  )
}
