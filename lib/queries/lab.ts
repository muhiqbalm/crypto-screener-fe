'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, request } from '@/lib/api/client'
import type {
  LabId,
  LabRunCreateRequest,
  LabScanCreateRequest,
} from '@/lib/api/types/lab'
import type { LabHoldoutLock, LabImportance, LabRunListItem } from '@/lib/api/types/lab-uji'
import { isActiveStatus } from '@/lib/lab/form'

const labKeys = {
  all: ['lab'] as const,
  me: () => [...labKeys.all, 'me'] as const,
  templates: () => [...labKeys.all, 'templates'] as const,
  symbols: () => [...labKeys.all, 'symbols'] as const,
  dataStatus: () => [...labKeys.all, 'data-status'] as const,
  /** Prefix of every runs list (invalidate this); each limit has its own cache entry. */
  runs: () => [...labKeys.all, 'runs'] as const,
  runsList: (limit: number) => [...labKeys.all, 'runs', limit] as const,
  run: (id: LabId) => [...labKeys.all, 'run', String(id)] as const,
  equity: (id: LabId) => [...labKeys.all, 'run', String(id), 'equity'] as const,
  trades: (id: LabId) => [...labKeys.all, 'run', String(id), 'trades'] as const,
  scans: () => [...labKeys.all, 'scans'] as const,
  scan: (id: LabId) => [...labKeys.all, 'scan', String(id)] as const,
  importance: (templateId: string, timeframe: string) => [...labKeys.all, 'importance', templateId, timeframe] as const,
  holdoutLock: (templateId: string, symbol: string, timeframe: string) =>
    [...labKeys.all, 'holdout-lock', templateId, symbol, timeframe] as const,
}

const POLL_MS = 3_000
/** Lists poll slower than a single run: they also tick for other people's scans. */
const LIST_POLL_MS = 10_000
const enc = (v: string) => encodeURIComponent(v)

/** Admin check. Any error (403, network…) is treated as "not admin". */
export function useLabMe(enabled = true) {
  return useQuery({
    queryKey: labKeys.me(),
    queryFn: ({ signal }) => api.getLabMe(signal),
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  })
}

export function useLabTemplates() {
  return useQuery({
    queryKey: labKeys.templates(),
    queryFn: ({ signal }) => api.getLabTemplates(signal),
    staleTime: 5 * 60_000,
  })
}

export function useLabSymbols() {
  return useQuery({
    queryKey: labKeys.symbols(),
    queryFn: ({ signal }) => api.getLabSymbols(signal),
    staleTime: 5 * 60_000,
  })
}

export function useLabDataStatus() {
  return useQuery({
    queryKey: labKeys.dataStatus(),
    queryFn: ({ signal }) => api.getLabDataStatus(signal),
    staleTime: 60_000,
  })
}

/** Latest runs. The cache key includes the limit, so a 200-row list never overwrites a 50-row one. */
export function useLabRuns(limit = 50) {
  return useQuery({
    queryKey: labKeys.runsList(limit),
    queryFn: ({ signal }) => api.getLabRuns(limit, signal) as Promise<LabRunListItem[]>,
    refetchInterval: (query) => {
      const rows = query.state.data as LabRunListItem[] | undefined
      return rows?.some((r) => isActiveStatus(r.status)) ? LIST_POLL_MS : false
    },
    refetchIntervalInBackground: false,
  })
}

export function useLabRun(id: LabId | null | undefined) {
  return useQuery({
    queryKey: labKeys.run(String(id ?? '')),
    queryFn: ({ signal }) => api.getLabRun(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => (isActiveStatus(query.state.data?.status) ? POLL_MS : false),
    refetchIntervalInBackground: false,
  })
}

export function useLabRunEquity(id: LabId, enabled: boolean) {
  return useQuery({
    queryKey: labKeys.equity(id),
    queryFn: ({ signal }) => api.getLabRunEquity(id, signal),
    enabled,
    staleTime: Infinity,
  })
}

export function useLabRunTrades(id: LabId, enabled: boolean) {
  return useQuery({
    queryKey: labKeys.trades(id),
    queryFn: ({ signal }) => api.getLabRunTrades(id, signal),
    enabled,
    staleTime: Infinity,
  })
}

export function useCreateLabRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LabRunCreateRequest) => api.createLabRun(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.runs() })
    },
  })
}

export function useCancelLabJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: LabId) => api.cancelLabJob(jobId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.all })
    },
  })
}

export function useLabScans() {
  return useQuery({
    queryKey: labKeys.scans(),
    queryFn: ({ signal }) => api.getLabScans(signal),
    refetchInterval: (query) => (query.state.data?.some((s) => isActiveStatus(s.status)) ? LIST_POLL_MS : false),
    refetchIntervalInBackground: false,
  })
}

export function useLabScan(id: LabId | null) {
  return useQuery({
    queryKey: labKeys.scan(String(id ?? '')),
    queryFn: ({ signal }) => api.getLabScan(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => (isActiveStatus(query.state.data?.status) ? POLL_MS : false),
    refetchIntervalInBackground: false,
  })
}

export function useCreateLabScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LabScanCreateRequest) => api.createLabScan(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.scans() })
    },
  })
}

/** Job progress (stage + trial X/Y) while a run is queued/running. */
export function useLabJob(jobId: LabId | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...labKeys.all, 'job', String(jobId ?? '')] as const,
    queryFn: ({ signal }) => api.getLabJob(jobId!, signal),
    enabled: enabled && jobId !== null && jobId !== undefined,
    refetchInterval: (query) => (isActiveStatus(query.state.data?.status ?? 'running') ? POLL_MS : false),
    refetchIntervalInBackground: false,
    retry: false,
  })
}

/**
 * Which params matter for a template x timeframe (GET /lab/templates/{id}/importance).
 * Read-only advice: never used to change a value automatically. Errors (older backend) are
 * left to the caller, which falls back to the template's own tunable flags.
 */
export function useLabImportance(templateId: string | null | undefined, timeframe: string | null | undefined) {
  return useQuery({
    queryKey: labKeys.importance(templateId ?? '', timeframe ?? ''),
    queryFn: ({ signal }) =>
      request<LabImportance>('GET', `/api/v1/lab/templates/${enc(templateId!)}/importance?timeframe=${enc(timeframe!)}`, undefined, signal),
    enabled: Boolean(templateId && timeframe),
    staleTime: 10 * 60_000,
    retry: false,
  })
}

/** Locked holdout of template x symbol x timeframe (read-only; never creates a lock). */
export function useLabHoldoutLock(templateId: string | null | undefined, symbol: string | null | undefined, timeframe: string | null | undefined) {
  return useQuery({
    queryKey: labKeys.holdoutLock(templateId ?? '', symbol ?? '', timeframe ?? ''),
    queryFn: ({ signal }) =>
      request<LabHoldoutLock>(
        'GET',
        `/api/v1/lab/holdout-lock?template_id=${enc(templateId!)}&symbol=${enc(symbol!)}&timeframe=${enc(timeframe!)}`,
        undefined,
        signal,
      ),
    enabled: Boolean(templateId && symbol && timeframe),
    staleTime: 60_000,
    retry: false,
  })
}
