'use client'
import { useQuery } from '@tanstack/react-query'
import { basketApi } from '@/lib/api/basket'

export const basketKeys = {
  all: () => ['lab', 'baskets'] as const,
  detail: (id: number) => ['lab', 'baskets', id] as const,
}

/** Every basket (Paper berjalan + Preset). Same cadence as the Arena report. */
export function useBaskets(enabled = true) {
  return useQuery({
    queryKey: basketKeys.all(),
    queryFn: ({ signal }) => basketApi.getReport(signal),
    enabled,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  })
}

/** One basket with curve, trades, skip log and rules (detail sheet). */
export function useBasketDetail(id: number | null) {
  return useQuery({
    queryKey: basketKeys.detail(id ?? 0),
    queryFn: ({ signal }) => basketApi.getDetail(id as number, signal),
    enabled: id !== null,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  })
}
