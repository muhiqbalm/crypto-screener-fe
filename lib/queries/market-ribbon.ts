'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { outlookApi } from '@/lib/api/outlook'

/**
 * Data for the market ribbon (macro + whale context). Calm refresh: every
 * 5 min while the tab is visible + when the tab regains focus. Query keys are
 * the same as the pages' own hooks (intel, screener, regime) so a page that
 * shows both never fetches twice; only the refresh rhythm differs.
 * All endpoints are readable by every logged-in user.
 */
export const RIBBON_REFRESH_MS = 5 * 60_000

const calm = {
  refetchInterval: RIBBON_REFRESH_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  staleTime: 60_000,
  retry: 1,
} as const

export function useRibbonRegime() {
  return useQuery({ queryKey: ['lab', 'regime'], queryFn: ({ signal }) => outlookApi.getRegime(signal), ...calm })
}

export function useRibbonNews() {
  return useQuery({ queryKey: ['intel-news'], queryFn: ({ signal }) => api.getIntelNews(signal), ...calm })
}

export function useRibbonWhales() {
  return useQuery({ queryKey: ['intel-whales'], queryFn: ({ signal }) => api.getIntelWhales(signal), ...calm })
}

export function useRibbonScreener() {
  return useQuery({ queryKey: ['screener', 'summary'], queryFn: ({ signal }) => api.getScreenerSummary(signal), ...calm })
}
