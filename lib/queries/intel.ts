import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useIntelWhales() {
  return useQuery({
    queryKey: ['intel-whales'],
    queryFn: ({ signal }) => api.getIntelWhales(signal),
    // The backend caches Binance data for 60 s (intel_service CACHE_TTL_SECONDS), so asking
    // more often only returns the same snapshot.
    refetchInterval: 60000,
    staleTime: 30000,
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
