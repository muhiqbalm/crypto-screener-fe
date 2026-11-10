'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScreenerSummary, screenerKeys } from '@/lib/queries/screener'
import { ScreenerFilters, type ScreenerFilterState } from '@/components/screener/ScreenerFilters'
import { ScreenerTable } from '@/components/screener/ScreenerTable'
import { MarketOverviewCards } from '@/components/screener/MarketOverviewCards'
import { CoinDetailDrawer } from '@/components/screener/CoinDetailDrawer'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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

  // Toast once per error kind (side effect kept out of render).
  useEffect(() => {
    if (!error) return
    const kind = error instanceof ApiError ? error.kind : 'server'
    if (dedupeToast(`screener-error-${kind}`, kind)) {
      notify.error(kind === 'network' ? 'Koneksi ke server terputus.' : 'Gagal memuat data screener.')
    }
  }, [error])

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
    return <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={handleRetry} />
  }

  // Empty state (Req 7.2, 7.3)
  const rawAssets = data?.assets ?? []
  if (rawAssets.length === 0) {
    return <EmptyPanel message="Belum ada data koin dari server." ctaLabel="Muat ulang" onCta={handleRetry} />
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
      {/* 2–3. Filters + interactive table in one card */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-end md:justify-between">
          <ScreenerFilters filters={filters} onFiltersChange={setFilters} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isStale && (
              <Badge
                variant="warn"
                size="sm"
                title="Backend menyajikan snapshot terakhir karena refresh terbaru gagal atau terlambat"
              >
                data basi ({Math.round(dataAge ?? 0)} dtk)
              </Badge>
            )}
            <span className="num">{assets.length} perpetual</span>
          </div>
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
