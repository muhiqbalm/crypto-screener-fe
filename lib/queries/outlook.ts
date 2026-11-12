'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { outlookApi } from '@/lib/api/outlook'
import { universalApi } from '@/lib/api/universal'
import { useLabMe } from '@/lib/queries/lab'
import type { OutlookInputs } from '@/lib/api/types/outlook'

// Outlook / Terkuat data change once per closed 4H candle: poll every 5 minutes (fast only while a
// refresh job runs), never in the background.
const SLOW_MS = 5 * 60_000
const FAST_MS = 5_000

const keys = {
  all: ['lab', 'outlook'] as const,
  list: (i: OutlookInputs) => [...keys.all, 'list', i] as const,
  detail: (s: string, i: OutlookInputs) => [...keys.all, 'detail', s, i] as const,
  regime: () => ['lab', 'regime'] as const,
  track: () => [...keys.all, 'track-record'] as const,
  rekamSkor: () => [...keys.all, 'rekam-skor'] as const,
  strength: () => ['koin', 'strength'] as const,
}

export function useOutlook(i: OutlookInputs) {
  return useQuery({
    queryKey: keys.list(i),
    queryFn: ({ signal }) => outlookApi.getOutlook(i, signal),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => {
      const s = q.state.data?.refresh?.status
      return s === 'queued' || s === 'running' ? FAST_MS : SLOW_MS
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

/** Rekam jejak skor (graded grade). Changes once per 4H bar; any logged-in user may read it. */
export function useRekamSkor(enabled = true) {
  return useQuery({
    queryKey: keys.rekamSkor(),
    queryFn: ({ signal }) => outlookApi.getRekamSkor(20, signal),
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

/** Koin Terkuat for the /koin "Terkuat" view (any logged-in user; 5-minute polling). */
export function useKoinStrength(enabled = true) {
  return useQuery({
    queryKey: keys.strength(),
    queryFn: ({ signal }) => universalApi.getStrength(signal),
    enabled,
    refetchInterval: (q) => {
      const s = q.state.data?.refresh?.status
      return s === 'queued' || s === 'running' ? FAST_MS : SLOW_MS
    },
    refetchIntervalInBackground: false,
  })
}

/** Admin only (the backend refuses others with 403). */
export function useRefreshKoinStrength() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => universalApi.refreshStrength(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.strength() }),
  })
}

/** true only when GET /lab/me says so; mutations (hitung ulang, kalibrasi) are shown to admins only. */
export function useIsLabAdmin(): boolean {
  const me = useLabMe()
  return me.data?.is_admin === true
}
