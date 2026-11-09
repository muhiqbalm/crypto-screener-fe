'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type {
  LabRunCreateRequest,
  LabRunSummary,
  LabScanCreateRequest,
} from '@/lib/api/types/lab'
import { isActiveStatus } from '@/lib/lab/form'

export const labKeys = {
  all: ['lab'] as const,
  me: () => [...labKeys.all, 'me'] as const,
  templates: () => [...labKeys.all, 'templates'] as const,
  symbols: () => [...labKeys.all, 'symbols'] as const,
  dataStatus: () => [...labKeys.all, 'data-status'] as const,
  runs: () => [...labKeys.all, 'runs'] as const,
  run: (id: string) => [...labKeys.all, 'run', id] as const,
  equity: (id: string) => [...labKeys.all, 'run', id, 'equity'] as const,
  trades: (id: string) => [...labKeys.all, 'run', id, 'trades'] as const,
  scans: () => [...labKeys.all, 'scans'] as const,
  scan: (id: string) => [...labKeys.all, 'scan', id] as const,
}

const POLL_MS = 3_000

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

export function useLabRuns(limit = 50) {
  return useQuery({
    queryKey: labKeys.runs(),
    queryFn: ({ signal }) => api.getLabRuns(limit, signal),
    refetchInterval: (query) => {
      const rows = query.state.data as LabRunSummary[] | undefined
      return rows?.some((r) => isActiveStatus(r.status)) ? POLL_MS : false
    },
    refetchIntervalInBackground: false,
  })
}

export function useLabRun(id: string | null | undefined) {
  return useQuery({
    queryKey: labKeys.run(id ?? ''),
    queryFn: ({ signal }) => api.getLabRun(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => (isActiveStatus(query.state.data?.status) ? POLL_MS : false),
    refetchIntervalInBackground: false,
  })
}

export function useLabRunEquity(id: string, enabled: boolean) {
  return useQuery({
    queryKey: labKeys.equity(id),
    queryFn: ({ signal }) => api.getLabRunEquity(id, signal),
    enabled,
    staleTime: Infinity,
  })
}

export function useLabRunTrades(id: string, enabled: boolean) {
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
    mutationFn: (jobId: string) => api.cancelLabJob(jobId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.all })
    },
  })
}

export function useLabScans() {
  return useQuery({
    queryKey: labKeys.scans(),
    queryFn: ({ signal }) => api.getLabScans(signal),
  })
}

export function useLabScan(id: string | null) {
  return useQuery({
    queryKey: labKeys.scan(id ?? ''),
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
