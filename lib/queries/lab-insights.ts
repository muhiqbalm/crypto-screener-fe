'use client'
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { labInsightsApi } from '@/lib/api/lab-insights'
import type { LabId } from '@/lib/api/types/lab'
import type { LabBoardFilters, LabEstimateRequest } from '@/lib/api/types/lab-insights'

// Same ['lab', …] root as lib/queries/lab.ts so a cancel / create invalidates these too.
const keys = {
  all: ['lab'] as const,
  defaults: () => ['lab', 'run-defaults'] as const,
  estimate: (b: LabEstimateRequest) => ['lab', 'estimate', b] as const,
  queue: () => ['lab', 'queue'] as const,
  board: (f: LabBoardFilters) => ['lab', 'leaderboard', f] as const,
  presets: () => ['lab', 'presets'] as const,
  bestPresets: (t: string, s: string[], tf: string[]) => ['lab', 'presets', 'best', t, s, tf] as const,
}

export function useLabRunDefaults() {
  return useQuery({
    queryKey: keys.defaults(),
    queryFn: ({ signal }) => labInsightsApi.getRunDefaults(signal),
    staleTime: 10 * 60_000,
    retry: false,
  })
}

/** Runtime estimate for the current builder inputs (null body = disabled). */
export function useLabEstimate(body: LabEstimateRequest | null) {
  return useQuery({
    queryKey: keys.estimate(body ?? { mode: 'validate', symbols: [], timeframes: [] }),
    queryFn: ({ signal }) => labInsightsApi.estimate(body!, signal),
    enabled: Boolean(body && body.symbols.length > 0 && body.timeframes.length > 0),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useLabQueue(enabled = true) {
  return useQuery({
    queryKey: keys.queue(),
    queryFn: ({ signal }) => labInsightsApi.getQueue(signal),
    enabled,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
}

export function useCancelLabScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scanId: LabId) => labInsightsApi.cancelScan(scanId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useLabLeaderboard(f: LabBoardFilters) {
  return useQuery({
    queryKey: keys.board(f),
    queryFn: ({ signal }) => labInsightsApi.getLeaderboard(f, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Details + equity for 2–4 runs in parallel (compare view). */
export function useCompareRuns(ids: string[]) {
  const details = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['lab', 'run', id] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => api.getLabRun(id, signal),
      staleTime: 30_000,
    })),
  })
  const equity = useQueries({
    queries: ids.map((id, i) => ({
      queryKey: ['lab', 'run', id, 'equity'] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => api.getLabRunEquity(id, signal),
      enabled: details[i]?.data?.status === 'done',
      staleTime: Infinity,
    })),
  })
  return { details, equity }
}

export function useLabPresets() {
  return useQuery({
    queryKey: keys.presets(),
    queryFn: ({ signal }) => labInsightsApi.getPresets(signal),
    staleTime: 30_000,
    retry: false,
  })
}

export function useBestPresets(templateId: string | null, symbols: string[], timeframes: string[], enabled: boolean) {
  return useQuery({
    queryKey: keys.bestPresets(templateId ?? '', symbols, timeframes),
    queryFn: ({ signal }) => labInsightsApi.getBestPresets(templateId!, symbols, timeframes, signal),
    enabled: enabled && Boolean(templateId) && symbols.length > 0 && timeframes.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

function useInvalidatePresets() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: keys.presets() })
    void qc.invalidateQueries({ queryKey: ['lab', 'leaderboard'] })
    void qc.invalidateQueries({ queryKey: ['lab', 'run'] })
  }
}

export function useSavePresetFromRun() {
  const inv = useInvalidatePresets()
  return useMutation({
    mutationFn: (a: { runId: LabId; label: string; notes?: string }) =>
      labInsightsApi.presetFromRun(a.runId, { label: a.label, notes: a.notes || undefined }),
    onSuccess: inv,
  })
}

export function usePatchPreset() {
  const inv = useInvalidatePresets()
  return useMutation({
    mutationFn: (a: { id: LabId; label?: string; notes?: string }) => labInsightsApi.patchPreset(a.id, { label: a.label, notes: a.notes }),
    onSuccess: inv,
  })
}

export function useDeletePreset() {
  const inv = useInvalidatePresets()
  return useMutation({ mutationFn: (id: LabId) => labInsightsApi.deletePreset(id), onSuccess: inv })
}

export function useWatchFromPreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (a: { id: LabId; accountId?: LabId }) =>
      labInsightsApi.watchFromPreset(a.id, a.accountId !== undefined ? { autopaper_account_id: a.accountId } : {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.presets() })
      void qc.invalidateQueries({ queryKey: ['lab', 'watches'] })
    },
  })
}
