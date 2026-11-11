'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export const screenerKeys = {
  all: ['screener'] as const,
  summary: () => [...screenerKeys.all, 'summary'] as const,
  trackRecord: () => [...screenerKeys.all, 'track-record'] as const,
}

export function useScreenerSummary() {
  return useQuery({
    queryKey: screenerKeys.summary(),
    queryFn: ({ signal }) => api.getScreenerSummary(signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * Signal Ledger track record per screener signal. The backend caches it for 10 min
 * and the ledger only changes hourly, so refetch slowly. Any error just hides the
 * indicators: the screener must never break because of it.
 */
export function useSignalTrackRecord(enabled = true) {
  return useQuery({
    queryKey: screenerKeys.trackRecord(),
    queryFn: ({ signal }) => api.getSignalTrackRecord(signal),
    enabled,
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
