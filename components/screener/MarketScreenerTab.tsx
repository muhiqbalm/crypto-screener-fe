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

  // Signals and bull/bear/neutral counts come straight from the backend
  // (response_builder._derive_signal, threshold ±0.02 on risk_adjusted_score).
  // The FE must not re-classify scores with its own thresholds.
  const assets: AssetDetail[] = rawAssets
  const summary = data?.summary ?? null
  const dataAge = data?.metadata?.data_age_seconds ?? null
  // stale_data_warning is set by the backend when data is older than 300s
  // (e.g. last good snapshot served after a failed refresh).
  const isStale = data?.metadata?.stale_data_warning === true || (dataAge !== null && dataAge > 300)

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
      {summary && (
        <MarketOverviewCards
          summary={summary}
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
          <span className="flex items-center gap-3 font-mono">
            {isStale && (
              <span
                className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-500"
                title="Backend is serving the last good snapshot because the latest refresh failed or is overdue"
              >
                stale ({Math.round(dataAge ?? 0)}s)
              </span>
            )}
            <span>{assets.length} perpetuals tracked</span>
          </span>
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
