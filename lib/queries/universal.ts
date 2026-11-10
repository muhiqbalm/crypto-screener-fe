'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { universalApi } from '@/lib/api/universal'
import type { LabId } from '@/lib/api/types/lab'
import type {
  UniversalRunCreateRequest,
  UniversalWatchCreateRequest,
  UniversalWatchPatch,
} from '@/lib/api/types/universal'

const keys = {
  all: ['lab', 'universal'] as const,
  schema: () => [...keys.all, 'schema'] as const,
  strength: () => [...keys.all, 'strength'] as const,
  watches: () => [...keys.all, 'watches'] as const,
  rebalances: (id: LabId) => [...keys.all, 'rebalances', String(id)] as const,
  contrib: (id: LabId) => [...keys.all, 'contrib', String(id)] as const,
}

export function useUniversalSchema() {
  return useQuery({ queryKey: keys.schema(), queryFn: ({ signal }) => universalApi.getSchema(signal), staleTime: 60_000 })
}

export function useStrength() {
  return useQuery({
    queryKey: keys.strength(),
    queryFn: ({ signal }) => universalApi.getStrength(signal),
    // poll while a refresh job is in flight, otherwise once a minute
    refetchInterval: (q) => {
      const s = q.state.data?.refresh?.status
      return s === 'queued' || s === 'running' ? 5_000 : 60_000
    },
    refetchIntervalInBackground: false,
  })
}

export function useRefreshStrength() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => universalApi.refreshStrength(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.strength() }),
  })
}

export function useCreateUniversalRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UniversalRunCreateRequest) => universalApi.createRun(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lab', 'runs'] }),
  })
}

export function useUniversalContrib(runId: LabId, enabled: boolean) {
  return useQuery({
    queryKey: keys.contrib(runId),
    queryFn: ({ signal }) => universalApi.getContrib(runId, signal),
    enabled,
    staleTime: Infinity,
  })
}

export function useUniversalWatches() {
  return useQuery({
    queryKey: keys.watches(),
    queryFn: ({ signal }) => universalApi.getWatches(signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useUniversalRebalances(watchId: LabId | null) {
  return useQuery({
    queryKey: keys.rebalances(String(watchId ?? '')),
    queryFn: ({ signal }) => universalApi.getRebalances(watchId!, signal),
    enabled: watchId !== null,
  })
}

export function useCreateUniversalWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UniversalWatchCreateRequest) => universalApi.createWatch(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function usePatchUniversalWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: LabId; body: UniversalWatchPatch }) => universalApi.patchWatch(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.watches() }),
  })
}

export function useDeleteUniversalWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: LabId) => universalApi.deleteWatch(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.watches() }),
  })
}
