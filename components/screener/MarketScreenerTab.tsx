'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScreenerSummary, screenerKeys } from '@/lib/queries/screener'
import { ScreenerFilters, type ScreenerFilterState } from '@/components/screener/ScreenerFilters'
import { ScreenerTable } from '@/components/screener/ScreenerTable'
import { MarketOverviewCards } from '@/components/screener/MarketOverviewCards'
import { CoinDetailDrawer } from '@/components/screener/CoinDetailDrawer'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { notify, dedupeToast } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'
import type { AssetDetail } from '@/lib/api/types/screener'

const DEFAULT_FILTERS: ScreenerFilterState = {
  symbol: '',
  signal: 'ALL',
  tier: 'ALL',
}

export function MarketScreenerTab() {
  const queryClient = useQueryClient()
  const { data, isPending, error } = useScreenerSummary()
  const [filters, setFilters] = useState<ScreenerFilterState>(DEFAULT_FILTERS)
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null)

  function handleRetry() {
    queryClient.invalidateQueries({ queryKey: screenerKeys.summary() })
  }

  // Pending state — 8 skeleton rows (Req 7.1)
  if (isPending) {
    return (
      <div className="space-y-4">
        {/* KPI Skeleton cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state (Req 7.5, 7.6, 7.7)
  if (error) {
    const kind = error instanceof ApiError ? error.kind : 'server'
    const dedupeKey = `screener-error-${kind}`
    if (dedupeToast(dedupeKey, kind)) {
      notify.error(
        kind === 'network'
          ? 'Network error. Please check your connection.'
          : 'Failed to load screener data.',
      )
    }
    return <ErrorPanel kind={kind} onRetry={handleRetry} />
  }

  // Empty state (Req 7.2, 7.3)
  const rawAssets = data?.assets ?? []
  if (rawAssets.length === 0) {
    return <EmptyPanel message="No assets available" ctaLabel="Retry" onCta={handleRetry} />
  }

  // Derive dynamic signals if backend threshold (> 0.5) left compressed scores as NEUTRAL
  const assets: AssetDetail[] = rawAssets.map((a) => {
    let effectiveSignal = a.signal
    if (effectiveSignal === 'NEUTRAL' || !effectiveSignal) {
      const score = a.composite_score ?? 0
      if (score >= 0.015) effectiveSignal = 'BULLISH'
      else if (score <= -0.015) effectiveSignal = 'BEARISH'
      else effectiveSignal = 'NEUTRAL'
    }
    return { ...a, signal: effectiveSignal }
  })

  // Recalculate market bias summary if all assets were classified as neutral
  const effectiveSummary = (() => {
    if (!data?.summary) return null
    const baseSummary = data.summary
    if (
      baseSummary.market_overview.bullish_count === 0 &&
      baseSummary.market_overview.bearish_count === 0 &&
      assets.length > 0
    ) {
      const bullCount = assets.filter((a) => a.signal === 'BULLISH').length
      const bearCount = assets.filter((a) => a.signal === 'BEARISH').length
      const neutCount = assets.length - bullCount - bearCount
      return {
        ...baseSummary,
        market_overview: {
          ...baseSummary.market_overview,
          bullish_count: bullCount,
          neutral_count: neutCount,
          bearish_count: bearCount,
        },
      }
    }
    return baseSummary
  })()

  function handleSelectSymbol(symbol: string) {
    const found = assets.find((a) => a.symbol === symbol || a.symbol.startsWith(symbol))
    if (found) {
      setSelectedAsset(found)
    }
  }

  // Data state (Req 7.4)
  return (
    <div className="space-y-6">
      {/* 1. Market Overview KPI Cards */}
      {effectiveSummary && (
        <MarketOverviewCards
          summary={effectiveSummary}
          onSelectCoin={handleSelectSymbol}
        />
      )}

      {/* 2. Filter Controls */}
      <div className="rounded-xl border border-border/80 bg-card/40 p-4 backdrop-blur-xs">
        <ScreenerFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* 3. Interactive Screener Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Click on any asset row to view 5-factor quant breakdown & live chart</span>
          <span className="font-mono">{assets.length} perpetuals tracked</span>
        </div>
        <ScreenerTable
          data={assets}
          filters={filters}
          onSelectAsset={setSelectedAsset}
        />
      </div>

      {/* 4. Slide-over Detail Drawer */}
      <CoinDetailDrawer
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  )
}
