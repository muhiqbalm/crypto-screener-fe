'use client'

import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Activity,
  Layers,
  ExternalLink,
  Flame,
  Scale,
  Compass,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { TierBadge } from '@/components/screener/TierBadge'
import type { AssetDetail } from '@/lib/api/types/screener'
import { cn } from '@/lib/utils/cn'
import { baseAsset, formatFunding, formatPrice, formatScore, formatVolume } from '@/lib/utils/format'
import type { SignalDirection } from '@/lib/api/types/screener'

interface CoinDetailDrawerProps {
  asset: AssetDetail | null
  onClose: () => void
}

function isNum(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && !isNaN(v)
}

function subSignalClass(sig: SignalDirection | null | undefined): string {
  if (sig === 'BULLISH') return 'text-bullish'
  if (sig === 'BEARISH') return 'text-bearish'
  return 'text-muted-foreground'
}

export function CoinDetailDrawer({ asset, onClose }: CoinDetailDrawerProps) {
  // Radix Sheet handles Esc, focus trap, scroll lock and focus return.
  return (
    <Sheet open={asset !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" aria-describedby={undefined} className="w-full max-w-lg overflow-y-auto bg-card p-6">
        {asset && <DrawerBody asset={asset} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({ asset, onClose }: { asset: AssetDetail; onClose: () => void }) {

  const symbolClean = baseAsset(asset.symbol)
  const change24h = asset.change_24h
  const hasChange = isNum(change24h)
  const isUp = hasChange && change24h >= 0
  const score = asset.composite_score
  const hasScore = isNum(score)
  const lsr = asset.long_short_ratio
  // Prefer momentum_signal; macd_signal is the backend's deprecated alias.
  const momentum = asset.momentum_signal ?? asset.macd_signal ?? null

  return (
    <>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4 pr-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                #{asset.rank ?? '-'}
              </span>
              <SheetTitle className="text-xl font-bold tracking-tight">{symbolClean}</SheetTitle>
              <span className="text-xs text-muted-foreground font-mono">/USDT Perp</span>
              <TierBadge tier={asset.tier} />
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-bold font-mono tracking-tight">
                {formatPrice(asset.price)}
              </span>
              {hasChange ? (
                <span
                  className={cn(
                    'flex items-center text-sm font-semibold font-mono',
                    isUp ? 'text-bullish' : 'text-bearish',
                  )}
                >
                  {isUp ? (
                    <TrendingUp className="mr-0.5 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="mr-0.5 h-4 w-4" aria-hidden="true" />
                  )}
                  {isUp ? '+' : ''}
                  {change24h.toFixed(2)}%
                </span>
              ) : (
                <span className="text-sm font-mono text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-6 flex-1 space-y-6">
          {/* Composite Score & Confidence Banner */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Composite Multi-Factor Score
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'font-mono text-xs font-bold',
                  !hasScore
                    ? 'text-muted-foreground'
                    : score >= 0
                      ? 'text-bullish border-bullish/30'
                      : 'text-bearish border-bearish/30',
                )}
              >
                {hasScore && score >= 0 ? '+' : ''}
                {formatScore(score, 4)}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-card p-2.5 border border-border">
                <span className="text-muted-foreground block text-2xs">Confidence Level</span>
                <span className="font-semibold text-sm">
                  {isNum(asset.confidence_pct) ? `${asset.confidence_pct.toFixed(1)}%` : '—'}
                  {asset.confidence_tier && (
                    <span className="text-3xs text-muted-foreground"> ({asset.confidence_tier})</span>
                  )}
                </span>
              </div>
              <div className="rounded-lg bg-card p-2.5 border border-border">
                <span className="text-muted-foreground block text-2xs">Composite Signal</span>
                <span className={cn('font-semibold text-sm', subSignalClass(asset.signal))}>
                  {asset.signal ?? '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Factor Quantitative Breakdown */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              5-Factor Quantitative Breakdown
            </h3>
            <div className="space-y-2.5">
              {/* Factor 1: Momentum */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-info" />
                  <div>
                    <span className="font-semibold block">Trend Momentum (30D)</span>
                    <span className="text-2xs text-muted-foreground">Weight: 30% • MA50 exhaustion check</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-xs',
                    momentum === 'BUY'
                      ? 'text-bullish'
                      : momentum === 'SELL'
                        ? 'text-bearish'
                        : 'text-muted-foreground',
                  )}
                >
                  {momentum ?? '—'}
                </Badge>
              </div>

              {/* Factor 2: Funding Rate */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-warn" />
                  <div>
                    <span className="font-semibold block">Funding Rate Contrarian</span>
                    <span className="text-2xs text-muted-foreground">Weight: 25% • Swap cost pressure</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold block">
                    {formatFunding(asset.funding_rate)}
                  </span>
                  <span className={cn('text-3xs font-bold', subSignalClass(asset.funding_rate_signal))}>
                    {asset.funding_rate_signal ?? '—'}
                  </span>
                </div>
              </div>

              {/* Factor 3: OI Momentum & Squeeze */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-bullish" />
                  <div>
                    <span className="font-semibold block">Open Interest Momentum</span>
                    <span className="text-2xs text-muted-foreground">Weight: 20% • USD notional, OI-price matrix</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold block">
                    {formatVolume(asset.open_interest)}
                  </span>
                  <span className={cn('text-3xs font-bold', subSignalClass(asset.oi_signal))}>
                    {asset.oi_signal ?? '—'}
                  </span>
                </div>
              </div>

              {/* Factor 4: Sentiment (L/S Ratio) */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-lab" />
                  <div>
                    <span className="font-semibold block">Sentiment (Long/Short Ratio)</span>
                    <span className="text-2xs text-muted-foreground">Weight: 15% • Trader positioning</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold block">
                    {isNum(lsr) ? lsr.toFixed(2) : '—'}
                  </span>
                  <span className="text-3xs text-muted-foreground">
                    {!isNum(lsr) ? 'No data' : lsr > 1.5 ? 'Crowded Long' : lsr < 0.8 ? 'Crowded Short' : 'Balanced'}
                  </span>
                </div>
              </div>

              {/* Factor 5: 1D Reversal */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-bearish" />
                  <div>
                    <span className="font-semibold block">Mean-Reversion (1D)</span>
                    <span className="text-2xs text-muted-foreground">Weight: 10% • Overbought/oversold</span>
                  </div>
                </div>
                <span className="font-mono font-semibold">
                  {isNum(asset.reversal_score) ? asset.reversal_score.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Position Sizing & Risk Management */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Optimal Position Sizing (Inverse Volatility)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-card p-3 border border-border">
                <span className="text-muted-foreground block text-2xs">Suggested Allocation</span>
                <span className="font-bold text-lg font-mono text-primary">
                  {isNum(asset.suggested_position_pct) ? `${asset.suggested_position_pct.toFixed(2)}%` : '—'}
                </span>
                <span className="text-3xs text-muted-foreground block mt-0.5">
                  of allocated portfolio capital
                </span>
              </div>
              <div className="rounded-lg bg-card p-3 border border-border">
                <span className="text-muted-foreground block text-2xs">Volatility (ATR %)</span>
                <span className="font-bold text-lg font-mono">
                  {isNum(asset.volatility) ? `${asset.volatility.toFixed(2)}%` : '—'}
                </span>
                <span className="text-3xs text-muted-foreground block mt-0.5">
                  Normalized risk factor
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 border-t border-border pt-4 flex items-center gap-3">
          <Button asChild className="flex-1 gap-2 cursor-pointer">
            <Link href={`/chart?symbol=${encodeURIComponent(`${symbolClean}USDT`)}`}>
              <ExternalLink className="h-4 w-4" />
              Buka chart live
            </Link>
          </Button>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
    </>
  )
}
