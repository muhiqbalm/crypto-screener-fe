'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { LabId, LabWatchCreateRequest } from '@/lib/api/types/lab'

export const labLiveKeys = {
  watches: () => ['lab', 'watches'] as const,
  watchState: (id: LabId) => ['lab', 'watch', String(id), 'state'] as const,
}

export const WATCH_STATE_POLL_MS = 30_000

export function useLabWatches(enabled = true) {
  return useQuery({
    queryKey: labLiveKeys.watches(),
    queryFn: ({ signal }) => api.getLabWatches(signal),
    enabled,
  })
}

export function useLabWatchState(id: LabId | null) {
  return useQuery({
    queryKey: labLiveKeys.watchState(String(id ?? '')),
    queryFn: ({ signal }) => api.getLabWatchState(id!, signal),
    enabled: Boolean(id),
    refetchInterval: WATCH_STATE_POLL_MS,
    refetchIntervalInBackground: false,
  })
}

export function useCreateLabWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LabWatchCreateRequest) => api.createLabWatch(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labLiveKeys.watches() })
    },
  })
}

export function useDeleteLabWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: LabId) => api.deleteLabWatch(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labLiveKeys.watches() })
    },
  })
}
