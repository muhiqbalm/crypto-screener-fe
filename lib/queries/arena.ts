'use client'
import { useQuery } from '@tanstack/react-query'
import { arenaApi } from '@/lib/api/arena'

export function useArenaReport() {
  return useQuery({
    queryKey: ['lab', 'arena'] as const,
    queryFn: ({ signal }) => arenaApi.getReport(signal),
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  })
}

export function useArenaCurves() {
  return useQuery({
    queryKey: ['lab', 'arena', 'curves'] as const,
    queryFn: ({ signal }) => arenaApi.getCurves(signal),
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  })
}
