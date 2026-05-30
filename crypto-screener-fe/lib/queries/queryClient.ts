import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // No retries for auth or not_found errors
          if (error instanceof ApiError && (error.kind === 'auth' || error.kind === 'not_found')) {
            return false
          }
          // Up to 2 retries for other errors
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      },
    },
  })
}

// Per-request server / per-process client singleton pattern
let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient per request
    return makeQueryClient()
  }
  // Browser: reuse the same QueryClient across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
