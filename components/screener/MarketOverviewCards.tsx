'use client'

import Link from 'next/link'
import { Activity, Flame, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { SummaryData, AssetSummary } from '@/lib/api/types/screener'
import { cn } from '@/lib/utils/cn'
import { baseAsset, formatFunding, formatVolume } from '@/lib/utils/format'
import { koinHref } from '@/lib/lab/outlook'

interface MarketOverviewCardsProps {
  summary: SummaryData
  /** @deprecated kept for old callers; the top coins now link to /koin/[simbol] */
  onSelectCoin?: (symbol: string) => void
}

// avg_funding_rate is already in PERCENT units (backend fetcher multiplies Binance's raw rate by 100).
// 0.01 = the 0.01% / 8h baseline; > 0.05% per 8h (5x baseline) = long ramai.
const HIGH_FUNDING_PCT = 0.05

function Tile({ label, icon, children, foot }: { label: string; icon: React.ReactNode; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow truncate">{label}</span>
          <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">{icon}</span>
        </div>
        <div className="mt-1.5">{children}</div>
        {foot && <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{foot}</p>}
      </CardContent>
    </Card>
  )
}

export function MarketOverviewCards({ summary }: MarketOverviewCardsProps) {
  const { market_overview: mo, top_3_assets } = summary
  const bull = mo?.bullish_count ?? 0
  const neu = mo?.neutral_count ?? 0
  const bear = mo?.bearish_count ?? 0
  const total = bull + neu + bear || 1
  const bullPct = Math.round((bull / total) * 100)
  const neuPct = Math.round((neu / total) * 100)
  const bearPct = Math.max(0, 100 - bullPct - neuPct)
  const avgFunding = mo?.avg_funding_rate ?? null
  const hasFunding = avgFunding !== null && !isNaN(avgFunding)

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Volume 24 jam" icon={<Activity className="h-4 w-4" aria-hidden="true" />}
        foot="Total volume kontrak perpetual semua koin di daftar.">
        <span className="num text-lg font-bold sm:text-2xl">{formatVolume(mo?.total_volume)}</span>
        {mo?.avg_change_24h !== null && mo?.avg_change_24h !== undefined && (
          <span className={cn('ml-1.5 num text-xs font-semibold', mo.avg_change_24h >= 0 ? 'text-bullish' : 'text-bearish')}>
            {mo.avg_change_24h >= 0 ? '+' : ''}{mo.avg_change_24h.toFixed(2)}% rata-rata
          </span>
        )}
      </Tile>

      <Tile label="Arah sinyal screener" icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        foot={bullPct > bearPct ? 'Lebih banyak koin bersinyal naik.' : bearPct > bullPct ? 'Lebih banyak koin bersinyal turun.' : 'Sinyal naik dan turun seimbang.'}>
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-bullish">{bull} naik</span>
          <span className="text-muted-foreground">{neu} netral</span>
          <span className="text-bearish">{bear} turun</span>
        </div>
        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted" role="img"
          aria-label={`${bull} naik, ${neu} netral, ${bear} turun`}>
          <div className="bg-bullish" style={{ width: `${bullPct}%` }} />
          <div className="bg-muted-foreground/40" style={{ width: `${neuPct}%` }} />
          <div className="bg-bearish" style={{ width: `${bearPct}%` }} />
        </div>
      </Tile>

      <Tile label="Funding rata-rata" icon={<Flame className="h-4 w-4" aria-hidden="true" />}
        foot={!hasFunding ? 'Data funding tidak tersedia.' : avgFunding > HIGH_FUNDING_PCT ? 'Tinggi: long ramai, rawan dibalik.'
          : avgFunding < 0 ? 'Negatif: short ramai, rawan short squeeze.' : 'Normal (sekitar 0.01% per 8 jam).'}>
        <span className="num text-lg font-bold sm:text-2xl">{formatFunding(avgFunding)}</span>
        <span className="ml-1 text-xs text-muted-foreground">/ 8 jam</span>
      </Tile>

      <Tile label="3 skor teratas" icon={<Zap className="h-4 w-4" aria-hidden="true" />}>
        <div className="flex flex-col gap-1">
          {top_3_assets && top_3_assets.length > 0 ? (
            top_3_assets.slice(0, 3).map((a: AssetSummary, idx: number) => (
              <Link key={a.symbol} href={koinHref(a.symbol)}
                className="flex items-center justify-between rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-muted/80">
                <span className="font-semibold">#{a.rank ?? idx + 1} {baseAsset(a.symbol)}</span>
                <span className="text-muted-foreground">{a.signal === 'BULLISH' ? 'naik' : a.signal === 'BEARISH' ? 'turun' : 'netral'}</span>
              </Link>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Tidak tersedia di data terakhir.</span>
          )}
        </div>
      </Tile>
    </div>
  )
}
