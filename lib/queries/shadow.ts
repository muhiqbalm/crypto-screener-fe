'use client'
import { useQuery } from '@tanstack/react-query'
import { shadowApi } from '@/lib/api/shadow'

export function useShadowReport() {
  return useQuery({
    queryKey: ['lab', 'shadow'] as const,
    queryFn: ({ signal }) => shadowApi.getReport(signal),
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  })
}
