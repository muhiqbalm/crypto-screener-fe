'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { useIntelWhales } from '@/lib/queries/intel'
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
 * Zero Static Mocking: the backend's /api/v1/intel/whales response mixes live
 * Binance data with hardcoded placeholders. Only live-derived values are shown:
 * - topTraderRatios entries flagged `updated: "Cached"` are the backend's
 *   static fallback and are dropped.
 * - whaleTransactions are only real when built from Binance aggTrades
 *   (ids prefixed "tx-fapi-"); the static fallback rows are dropped.
 * - whaleVolume24h / whaleVolumeChange / exchangeNetFlow are constant strings
 *   in the backend and are not rendered.
 */
function liveRatios(ratios: TopTraderRatio[] | undefined): TopTraderRatio[] {
  return (ratios ?? []).filter((r) => r.updated !== 'Cached')
}

function liveTrades(trades: WhaleTrade[] | undefined): WhaleTrade[] {
  return (trades ?? []).filter((t) => t.id.startsWith('tx-fapi-'))
}

function parseUsd(v: string): number {
  const n = Number(v.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatUsdCompact(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

// "outflow" in the backend payload = aggressive (taker) buy; "inflow" = taker sell.
function isTakerBuy(tx: WhaleTrade): boolean {
  return tx.type === 'outflow'
}

export function WhaleRadarView() {
  const { data: intel, isPending, error, isFetching, refetch } = useIntelWhales()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all')

  const ratios = liveRatios(intel?.topTraderRatios)
  const transactions = liveTrades(intel?.whaleTransactions)

  const avgLong =
    ratios.length > 0 ? ratios.reduce((sum, r) => sum + r.longPct, 0) / ratios.length : null
  const takerBuyUsd = transactions.filter(isTakerBuy).reduce((s, t) => s + parseUsd(t.usdValue), 0)
  const takerSellUsd = transactions
    .filter((t) => !isTakerBuy(t))
    .reduce((s, t) => s + parseUsd(t.usdValue), 0)
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium shadow-sm">
            <Radar className="h-3.5 w-3.5 text-cyan-400" />
            WHALE RADAR
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Whale Radar &amp; Top Trader Positioning
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Binance Futures top-trader long/short ratios and large BTCUSDT perpetual trades
            (≥ $50k) from the most recent aggregated trades.
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
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
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
      ) : (
        <>
          {/* Overview Stat Cards — all derived from live data in this response */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Large Trades Captured"
              icon={<Activity className="h-4 w-4 text-cyan-400" />}
              value={String(transactions.length)}
              caption="BTCUSDT perp trades ≥ $50k in latest 60 aggTrades"
            />
            <StatCard
              title="Taker Buy Notional"
              icon={<CircleDollarSign className="h-4 w-4 text-emerald-400" />}
              value={transactions.length > 0 ? formatUsdCompact(takerBuyUsd) : '—'}
              valueClass="text-emerald-400"
              caption="Sum of large aggressive buys"
            />
            <StatCard
              title="Taker Sell Notional"
              icon={<Layers className="h-4 w-4 text-rose-400" />}
              value={transactions.length > 0 ? formatUsdCompact(takerSellUsd) : '—'}
              valueClass="text-rose-400"
              caption="Sum of large aggressive sells"
            />
            <StatCard
              title="Top Trader Bias"
              icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
              value={
                avgLong === null
                  ? '—'
                  : avgLong >= 50
                    ? `${avgLong.toFixed(1)}% Long`
                    : `${(100 - avgLong).toFixed(1)}% Short`
              }
              caption={
                avgLong === null
                  ? 'No live ratio data'
                  : `Average across ${ratios.length} symbol${ratios.length === 1 ? '' : 's'}`
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
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 ${
                              isBullish
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isBullish ? 'Long Skew' : 'Short Skew'}
                          </Badge>
                        </div>

                        <div className="flex justify-between text-xs font-mono font-medium">
                          <span className="text-emerald-400">Long: {item.longPct}%</span>
                          <span className="text-rose-400">Short: {item.shortPct}%</span>
                        </div>

                        <div className="w-full h-2 bg-rose-500/30 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-400 h-full transition-all duration-500 rounded-l-full"
                            style={{ width: `${item.longPct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/30">
                          <span>
                            L/S Ratio:{' '}
                            <strong className="text-foreground">
                              {item.lsRatio ?? (item.shortPct ? (item.longPct / item.shortPct).toFixed(2) : '—')}
                            </strong>
                          </span>
                          <span>{item.updated}</span>
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
                  Binance BTCUSDT perpetual aggregated trades with notional ≥ $50,000.
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
                  No trades ≥ $50k in the latest Binance snapshot.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] font-mono uppercase text-left">
                        <th className="py-3 px-5 font-semibold">Asset</th>
                        <th className="py-3 px-5 font-semibold">Size</th>
                        <th className="py-3 px-5 font-semibold text-right">Notional</th>
                        <th className="py-3 px-5 font-semibold text-right">Taker Side</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-5 font-mono">
                            <span className="px-2 py-0.5 rounded-md bg-muted/70 text-[11px] font-semibold border border-border/50">
                              {tx.symbol}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-muted-foreground whitespace-nowrap">{tx.amount}</td>
                          <td className="py-3.5 px-5 font-mono text-right font-bold text-foreground whitespace-nowrap">
                            {tx.usdValue}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {isTakerBuy(tx) ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] gap-1 font-mono py-1 px-2.5">
                                <ArrowUpRight className="h-3 w-3" /> Buy
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] gap-1 font-mono py-1 px-2.5">
                                <ArrowDownRight className="h-3 w-3" /> Sell
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredTxs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground">
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
        <div className={`text-2xl font-bold font-mono tracking-tight ${valueClass ?? 'text-foreground'}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{caption}</p>
      </CardContent>
    </Card>
  )
}
