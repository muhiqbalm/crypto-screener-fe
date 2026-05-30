'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export const screenerKeys = {
  all: ['screener'] as const,
  summary: () => [...screenerKeys.all, 'summary'] as const,
}

export function useScreenerSummary() {
  return useQuery({
    queryKey: screenerKeys.summary(),
    queryFn: ({ signal }) => api.getScreenerSummary(signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}
