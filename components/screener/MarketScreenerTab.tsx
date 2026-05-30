'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScreenerSummary, screenerKeys } from '@/lib/queries/screener'
import { ScreenerFilters, type ScreenerFilterState } from '@/components/screener/ScreenerFilters'
import { ScreenerTable } from '@/components/screener/ScreenerTable'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { notify, dedupeToast } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'

const DEFAULT_FILTERS: ScreenerFilterState = {
  symbol: '',
  signal: 'ALL',
  tier: 'ALL',
}

export function MarketScreenerTab() {
  const queryClient = useQueryClient()
  const { data, isPending, error } = useScreenerSummary()
  const [filters, setFilters] = useState<ScreenerFilterState>(DEFAULT_FILTERS)

  function handleRetry() {
    queryClient.invalidateQueries({ queryKey: screenerKeys.summary() })
  }

  // Pending state — 8 skeleton rows (Req 7.1)
  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
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
  const assets = data?.assets ?? []
  if (assets.length === 0) {
    return <EmptyPanel message="No assets available" ctaLabel="Retry" onCta={handleRetry} />
  }

  // Data state (Req 7.4)
  return (
    <div className="space-y-4">
      <ScreenerFilters filters={filters} onFiltersChange={setFilters} />
      <ScreenerTable data={assets} filters={filters} />
    </div>
  )
}
