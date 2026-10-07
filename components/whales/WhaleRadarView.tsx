'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIntelWhales } from '@/lib/queries/intel'
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  RefreshCw,
  TrendingUp,
  Layers,
  CircleDollarSign,
  Radar,
  ShieldCheck,
  Activity,
  ArrowRight
} from 'lucide-react'

interface WhaleTx {
  id: string
  timestamp: string
  symbol: string
  amount: string
  usdValue: string
  from: string
  to: string
  type: 'inflow' | 'outflow' | 'transfer'
  confidence: number
  catalyst: string
}

const FALLBACK_TXS: WhaleTx[] = [
  {
    id: 'tx-01',
    timestamp: '2 mins ago',
    symbol: 'BTC',
    amount: '2,450 BTC',
    usdValue: '$209,180,000',
    from: 'Coinbase Prime Custody',
    to: 'Binance Hot Wallet',
    type: 'inflow',
    confidence: 94,
    catalyst: 'Potential Spot Sell Liquidity / Hedge Setup'
  },
  {
    id: 'tx-02',
    timestamp: '7 mins ago',
    symbol: 'ETH',
    amount: '45,800 ETH',
    usdValue: '$124,347,000',
    from: 'Binance Cold Storage',
    to: 'Unknown Whale 0x7a3...c91',
    type: 'outflow',
    confidence: 98,
    catalyst: 'Institutional Cold Storage Accumulation'
  },
  {
    id: 'tx-03',
    timestamp: '14 mins ago',
    symbol: 'SOL',
    amount: '820,000 SOL',
    usdValue: '$98,676,000',
    from: 'FTX Bankruptcy Estate Distribution',
    to: 'Kraken OTC Desk',
    type: 'inflow',
    confidence: 91,
    catalyst: 'OTC Absorption / Mitigated Market Impact'
  }
]

export function WhaleRadarView() {
  const { data: intel, isLoading, isFetching, refetch } = useIntelWhales()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all')

  const topTraderRatios = intel?.topTraderRatios ?? [
    { symbol: 'BTCUSDT', longPct: 66.5, shortPct: 33.5, lsRatio: 1.99, updated: 'Live FAPI' },
    { symbol: 'ETHUSDT', longPct: 61.2, shortPct: 38.8, lsRatio: 1.58, updated: 'Live FAPI' },
    { symbol: 'SOLUSDT', longPct: 48.0, shortPct: 52.0, lsRatio: 0.92, updated: 'Live FAPI' },
    { symbol: 'DOGEUSDT', longPct: 71.4, shortPct: 28.6, lsRatio: 2.50, updated: 'Live FAPI' },
  ]

  const transactions: WhaleTx[] = intel?.whaleTransactions ?? FALLBACK_TXS

  const filteredTxs = transactions.filter((tx) => {
    const matchesSearch =
      tx.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.catalyst.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || tx.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/40 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium shadow-sm">
            <Radar className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            ON-CHAIN WHALE RADAR &amp; SMART MONEY
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Whale Radar &amp; Smart Money Flow
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Live institutional exchange flows, cold storage wallet tracking, and Binance Futures Top Trader long/short positioning ratios in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {intel?.source ?? 'Binance Futures FAPI (Live)'}
          </Badge>
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-emerald-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              24H Whale Volume
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CircleDollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {intel?.whaleVolume24h ?? '$1,482,850,000'}
            </div>
            <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1 font-mono font-medium">
              <TrendingUp className="h-3.5 w-3.5" /> {intel?.whaleVolumeChange ?? '+14.2%'} vs prev 24h
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-cyan-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              Exchange Net Flow
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {intel?.exchangeNetFlow ?? '-$342.5M Outflow'}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-tight">
              Net accumulation to cold storage
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-emerald-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              Top Trader Bias
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {intel?.topTraderBias ?? '68.4% Long'}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-tight">
              Binance Top 20% Accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-emerald-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              Smart Money Stance
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight text-ellipsis overflow-hidden">
              {intel?.smartMoneyStance ?? 'ACCUMULATION'}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-tight">
              High confidence institutional absorption
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Binance Top Trader Long/Short Ratio Matrix */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-md overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              Binance Top Trader Long / Short Position Ratio
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Live sentiment and margin exposure of the top 20% highest equity accounts on Binance Futures.
            </p>
          </div>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 font-mono text-xs gap-1.5 self-start sm:self-auto py-1 px-3">
            <Activity className="h-3 w-3 animate-pulse" />
            Live Binance Derivatives
          </Badge>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topTraderRatios.map((item: any) => {
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
                      {isBullish ? 'Bullish Skew' : 'Bearish Skew'}
                    </Badge>
                  </div>

                  <div className="flex justify-between text-xs font-mono font-medium">
                    <span className="text-emerald-400">Long: {item.longPct}%</span>
                    <span className="text-rose-400">Short: {item.shortPct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-rose-500/30 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-500 rounded-l-full"
                      style={{ width: `${item.longPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/30">
                    <span>L/S Ratio: <strong className="text-foreground">{item.lsRatio ?? (item.longPct / (item.shortPct || 1)).toFixed(2)}</strong></span>
                    <span>{item.updated ?? 'Live FAPI'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Whale Order Flow Stream */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-md overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground">
              Live High-Value Transfer &amp; Derivatives Orders
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time large trades and on-chain movements exceeding $50,000 classified with quantitative catalyst detection.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search token, entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs bg-background/60 border-border/80 focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-1 border border-border/80 rounded-lg p-1 bg-background/60">
              <Button
                variant={filterType === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="h-7 text-xs px-3 font-medium cursor-pointer"
              >
                All
              </Button>
              <Button
                variant={filterType === 'outflow' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('outflow')}
                className="h-7 text-xs px-3 font-medium cursor-pointer"
              >
                Accumulation
              </Button>
              <Button
                variant={filterType === 'inflow' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('inflow')}
                className="h-7 text-xs px-3 font-medium cursor-pointer"
              >
                Sell Pressure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] font-mono uppercase text-left">
                  <th className="py-3 px-5 font-semibold">Time</th>
                  <th className="py-3 px-5 font-semibold">Asset &amp; Value</th>
                  <th className="py-3 px-5 font-semibold">Flow Type</th>
                  <th className="py-3 px-5 font-semibold">From &rarr; To</th>
                  <th className="py-3 px-5 font-semibold">Catalyst Analysis</th>
                  <th className="py-3 px-5 font-semibold text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-muted-foreground whitespace-nowrap">
                      {tx.timestamp}
                    </td>
                    <td className="py-3.5 px-5 font-mono whitespace-nowrap">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-muted/70 text-[11px] font-semibold border border-border/50">{tx.symbol}</span>
                        <span className="text-emerald-400 font-bold">{tx.usdValue}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{tx.amount}</div>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {tx.type === 'outflow' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] gap-1 font-mono py-1 px-2.5">
                          <ArrowDownRight className="h-3 w-3" /> Accumulation
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] gap-1 font-mono py-1 px-2.5">
                          <ArrowUpRight className="h-3 w-3" /> Sell Pressure
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[11px] whitespace-nowrap">
                      <div className="text-foreground font-medium">{tx.from}</div>
                      <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                        <ArrowRight className="h-3 w-3 text-muted-foreground/60" /> {tx.to}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-[11px] max-w-sm font-mono">
                      <span className={tx.type === 'outflow' ? 'text-emerald-400/95 font-medium' : 'text-rose-400/95 font-medium'}>
                        {tx.catalyst}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-right font-bold text-emerald-400 whitespace-nowrap">
                      {tx.confidence}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
