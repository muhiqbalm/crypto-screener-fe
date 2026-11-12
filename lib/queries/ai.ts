'use client'
import { useQuery } from '@tanstack/react-query'
import { aiApi } from '@/lib/api/ai'

// A summary appears a few minutes after each 4H close and then stays until the next one:
// poll every 5 minutes while the page is visible, never in the background, retry once.
const keys = {
  factors: (symbol: string) => ['lab', 'ai', 'factors', symbol] as const,
}

export function useAiFactors(symbol: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.factors(symbol ?? ''),
    queryFn: ({ signal }) => aiApi.getFactors(symbol as string, signal),
    enabled: Boolean(symbol) && enabled,
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
