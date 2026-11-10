'use client'

import { Activity, Flame, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SummaryData, AssetSummary } from '@/lib/api/types/screener'
import { cn } from '@/lib/utils/cn'
import { baseAsset, formatFunding, formatScore, formatVolume } from '@/lib/utils/format'

interface MarketOverviewCardsProps {
  summary: SummaryData
  onSelectCoin?: (symbol: string) => void
}

export function MarketOverviewCards({ summary, onSelectCoin }: MarketOverviewCardsProps) {
  const { market_overview, top_3_assets } = summary
  const totalAssets =
    (market_overview?.bullish_count ?? 0) +
    (market_overview?.neutral_count ?? 0) +
    (market_overview?.bearish_count ?? 0) || 1

  const bullishPct = Math.round(((market_overview?.bullish_count ?? 0) / totalAssets) * 100)
  const neutralPct = Math.round(((market_overview?.neutral_count ?? 0) / totalAssets) * 100)
  const bearishPct = Math.max(0, 100 - bullishPct - neutralPct)

  // avg_funding_rate is already in PERCENT units (backend fetcher multiplies
  // Binance's raw rate by 100). 0.01 = the 0.01% / 8h Binance baseline.
  const avgFunding = market_overview?.avg_funding_rate ?? null
  const hasFunding = avgFunding !== null && !isNaN(avgFunding)
  const isFundingPositive = hasFunding && avgFunding >= 0
  // > 0.05% per 8h (5x the baseline) is treated as an elevated long premium.
  const HIGH_FUNDING_PCT = 0.05

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. 24h Market Volume */}
      <Card className="relative overflow-hidden border-border bg-card shadow-xs ">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              24h Futures Volume
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight">
              {formatVolume(market_overview?.total_volume)}
            </span>
            {market_overview?.avg_change_24h !== null && market_overview?.avg_change_24h !== undefined && (
              <span
                className={cn(
                  'text-xs font-semibold font-mono',
                  market_overview.avg_change_24h >= 0 ? 'text-bullish' : 'text-bearish',
                )}
              >
                {market_overview.avg_change_24h >= 0 ? '+' : ''}
                {market_overview.avg_change_24h.toFixed(2)}% avg
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Aggregate perpetual volume tracked across universe
          </p>
        </CardContent>
      </Card>

      {/* 2. Market Sentiment Gauge */}
      <Card className="relative overflow-hidden border-border bg-card shadow-xs ">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Market Bias (Sentiment)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bullish/10 text-bullish">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-mono font-medium">
            <span className="text-bullish">{market_overview?.bullish_count ?? 0} Bull</span>
            <span className="text-muted-foreground">{market_overview?.neutral_count ?? 0} Neutral</span>
            <span className="text-bearish">{market_overview?.bearish_count ?? 0} Bear</span>
          </div>
          {/* Segmented bar */}
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-bullish transition-all duration-500"
              style={{ width: `${bullishPct}%` }}
              title={`Bullish: ${bullishPct}%`}
            />
            <div
              className="bg-warn/80 transition-all duration-500"
              style={{ width: `${neutralPct}%` }}
              title={`Neutral: ${neutralPct}%`}
            />
            <div
              className="bg-bearish transition-all duration-500"
              style={{ width: `${bearishPct}%` }}
              title={`Bearish: ${bearishPct}%`}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {bullishPct > bearishPct
              ? 'Bullish dominance across quant signals'
              : bearishPct > bullishPct
                ? 'Bearish pressure detected'
                : 'Balanced neutral market consolidation'}
          </p>
        </CardContent>
      </Card>

      {/* 3. Average Funding Rate */}
      <Card className="relative overflow-hidden border-border bg-card shadow-xs ">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Avg Funding Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warn/10 text-warn">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                'text-2xl font-bold font-mono tracking-tight',
                !hasFunding
                  ? 'text-muted-foreground'
                  : isFundingPositive
                    ? 'text-bullish'
                    : 'text-bearish',
              )}
            >
              {formatFunding(avgFunding)}
            </span>
            <span className="text-xs text-muted-foreground">/ 8h cycle</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-primary/40" />
            <span>
              {!hasFunding
                ? 'Funding data unavailable'
                : avgFunding > HIGH_FUNDING_PCT
                  ? 'High long premium (contrarian risk)'
                  : avgFunding < 0
                    ? 'Negative funding (short squeeze potential)'
                    : 'Normal healthy swap baseline'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Top Ranked Opportunities */}
      <Card className="relative overflow-hidden border-border bg-card shadow-xs ">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Top Quant Picks
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lab/10 text-lab">
              <Zap className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {top_3_assets && top_3_assets.length > 0 ? (
              top_3_assets.slice(0, 3).map((asset: AssetSummary, idx: number) => {
                const label = baseAsset(asset.symbol)
                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() => onSelectCoin?.(asset.symbol)}
                    className="flex items-center justify-between rounded-md p-1 px-1.5 text-xs transition-colors hover:bg-muted/80 cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-3xs font-bold text-primary">
                        #{asset.rank ?? idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      {asset.confidence_tier && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-3xs px-1.5 py-0 font-medium',
                            asset.confidence_tier === 'HIGH'
                              ? 'bg-bullish/10 text-bullish'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {asset.confidence_tier}
                        </Badge>
                      )}
                      <span
                        className={cn(
                          'text-xs font-bold',
                          asset.composite_score === null
                            ? 'text-muted-foreground'
                            : asset.composite_score >= 0
                              ? 'text-bullish'
                              : 'text-bearish',
                        )}
                      >
                        {asset.composite_score !== null && asset.composite_score > 0 ? '+' : ''}
                        {formatScore(asset.composite_score, 3)}
                      </span>
                    </div>
                  </button>
                )
              })
            ) : (
              <span className="text-xs text-muted-foreground">No ranked assets in this snapshot</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
