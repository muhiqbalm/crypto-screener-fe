'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScreenerSummary, screenerKeys } from '@/lib/queries/screener'
import { ScreenerFilters, type ScreenerFilterState } from '@/components/screener/ScreenerFilters'
import { ScreenerTable } from '@/components/screener/ScreenerTable'
import { MarketOverviewCards } from '@/components/screener/MarketOverviewCards'
import { TrackRecordFootnote, TrackRecordProvider } from '@/components/screener/TrackRecordHint'
import { InfoHint } from '@/components/market/shared'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ApiError } from '@/lib/api/errors'
import { SCORE_HINT, TIER_HINT } from '@/lib/screener/factors'
import type { AssetDetail } from '@/lib/api/types/screener'

const DEFAULT_FILTERS: ScreenerFilterState = { symbol: '', signal: 'ALL', tier: 'ALL' }

/**
 * Peluang koin → "Tabel faktor": the screener's 5-factor table (all filters, sorting and the
 * track-record icon kept). Rows open the coin page; the drawer's content lives there now.
 */
export function FactorTable() {
  const queryClient = useQueryClient()
  const { data, isPending, error } = useScreenerSummary()
  const [filters, setFilters] = useState<ScreenerFilterState>(DEFAULT_FILTERS)

  const retry = () => queryClient.invalidateQueries({ queryKey: screenerKeys.summary() })

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }
  // One error surface only (no toast on top of the panel).
  if (error) return <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={retry} />

  const assets: AssetDetail[] = data?.assets ?? []
  if (assets.length === 0) return <EmptyPanel message="Belum ada data koin dari server." ctaLabel="Muat ulang" onCta={retry} />

  // Signals and counts come straight from the backend (no re-classification in the FE).
  const summary = data?.summary ?? null
  const dataAge = data?.metadata?.data_age_seconds ?? null
  const isStale = data?.metadata?.stale_data_warning === true || (dataAge !== null && dataAge > 300)

  return (
    <TrackRecordProvider>
      <div className="space-y-4">
        {summary && <MarketOverviewCards summary={summary} />}
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-end md:justify-between">
            <ScreenerFilters filters={filters} onFiltersChange={setFilters} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isStale && (
                <Badge variant="warn" size="sm" title="Server menyajikan data terakhir karena pembaruan terbaru gagal atau terlambat">
                  data terlambat ({Math.round(dataAge ?? 0)} dtk)
                </Badge>
              )}
              <span className="num">{assets.length} koin</span>
              <span className="inline-flex items-center gap-1">
                Skor <InfoHint label="Skor screener">{SCORE_HINT}</InfoHint>
              </span>
              <span className="inline-flex items-center gap-1">
                Kelompok <InfoHint label="Kelompok skor">{TIER_HINT}</InfoHint>
              </span>
            </div>
          </div>
          <ScreenerTable data={assets} filters={filters} />
          <TrackRecordFootnote />
        </div>
        <p className="text-2xs text-muted-foreground">
          Sinyal screener adalah arah skor saat ini, bukan perintah beli atau jual. Keputusan per koin (arah strategi,
          rencana, bukti) ada di halaman koin — klik nama koin.
        </p>
      </div>
    </TrackRecordProvider>
  )
}
