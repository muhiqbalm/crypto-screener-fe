'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export const positionKeys = {
  all: ['positions'] as const,
  open: () => [...positionKeys.all, 'open'] as const,
  history: () => [...positionKeys.all, 'history'] as const,
}

export function useOpenPositions() {
  return useQuery({
    queryKey: positionKeys.open(),
    queryFn: ({ signal }) => api.getPositions(signal),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  })
}

export function usePositionsHistory() {
  return useQuery({
    queryKey: positionKeys.history(),
    queryFn: ({ signal }) => api.getPositionsHistory(signal),
    staleTime: 30_000,
  })
}
