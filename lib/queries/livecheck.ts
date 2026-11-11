'use client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { liveCheckApi } from '@/lib/api/livecheck'

export function useLiveCheck(bars: number) {
  return useQuery({
    queryKey: ['lab', 'live-check', bars] as const,
    queryFn: ({ signal }) => liveCheckApi.getReport(bars, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  })
}
