import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useIntelWhales() {
  return useQuery({
    queryKey: ['intel-whales'],
    queryFn: ({ signal }) => api.getIntelWhales(signal),
    refetchInterval: 30000, // auto refetch every 30 seconds
    staleTime: 20000,
  })
}

export function useIntelNews() {
  return useQuery({
    queryKey: ['intel-news'],
    queryFn: ({ signal }) => api.getIntelNews(signal),
    refetchInterval: 60000, // auto refetch every 60 seconds
    staleTime: 30000,
  })
}
