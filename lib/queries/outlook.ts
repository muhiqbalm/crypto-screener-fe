'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { outlookApi } from '@/lib/api/outlook'
import type { OutlookInputs } from '@/lib/api/types/outlook'

const keys = {
  all: ['lab', 'outlook'] as const,
  list: (i: OutlookInputs) => [...keys.all, 'list', i] as const,
  detail: (s: string, i: OutlookInputs) => [...keys.all, 'detail', s, i] as const,
  regime: () => ['lab', 'regime'] as const,
  track: () => [...keys.all, 'track-record'] as const,
}

export function useOutlook(i: OutlookInputs) {
  return useQuery({
    queryKey: keys.list(i),
    queryFn: ({ signal }) => outlookApi.getOutlook(i, signal),
    placeholderData: keepPreviousData,
    // poll while a refresh job is in flight, otherwise once a minute
    refetchInterval: (q) => {
      const s = q.state.data?.refresh?.status
      return s === 'queued' || s === 'running' ? 5_000 : 60_000
    },
    refetchIntervalInBackground: false,
  })
}

export function useOutlookDetail(symbol: string | null, i: OutlookInputs) {
  return useQuery({
    queryKey: keys.detail(symbol ?? '', i),
    queryFn: ({ signal }) => outlookApi.getDetail(symbol as string, i, signal),
    enabled: Boolean(symbol),
    placeholderData: keepPreviousData,
  })
}

export function useRefreshOutlook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => outlookApi.refresh(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useCalibrateOutlook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => outlookApi.calibrate(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.all }),
  })
}

/** Live track record of stored calls (evaluated after the fact). Changes once per 4H bar. */
export function useOutlookTrackRecord(enabled = true) {
  return useQuery({
    queryKey: keys.track(),
    queryFn: ({ signal }) => outlookApi.getTrackRecord(100, signal),
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchIntervalInBackground: false,
  })
}

/** Market regime: any logged-in user. Changes once a day; errors just hide the badge. */
export function useRegime(enabled = true) {
  return useQuery({
    queryKey: keys.regime(),
    queryFn: ({ signal }) => outlookApi.getRegime(signal),
    enabled,
    staleTime: 10 * 60_000,
    refetchInterval: 30 * 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
