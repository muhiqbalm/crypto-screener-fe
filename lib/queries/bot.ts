'use client'
import { useQuery } from '@tanstack/react-query'
import { botApi } from '@/lib/api/bot'

/** Webhook on/off + last processed alert for the /bot page. A cheap DB read; refreshed every minute. */
export function useBotStatus(enabled = true) {
  return useQuery({
    queryKey: ['lab', 'bot-status'] as const,
    queryFn: ({ signal }) => botApi.getStatus(signal),
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}
