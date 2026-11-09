'use client'
import { useQuery } from '@tanstack/react-query'
import { getBaseUrl } from '@/lib/api/client'
import { PATHS } from '@/lib/api/paths'

export type ApiHealthStatus = 'healthy' | 'degraded' | 'offline'

export interface ApiHealth {
  status: ApiHealthStatus
  /** Measured round-trip time of the /health request in ms. */
  latencyMs: number | null
}

/**
 * Polls the backend's public GET /api/v1/health endpoint and measures the
 * round-trip latency in the browser. Never throws: any network/HTTP failure
 * resolves to { status: 'offline' } so the UI shows a real offline state
 * instead of a hardcoded "live" badge.
 */
async function fetchHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const started = performance.now()
  try {
    const res = await fetch(`${getBaseUrl()}${PATHS.health}`, {
      cache: 'no-store',
      signal,
    })
    const latencyMs = Math.round(performance.now() - started)
    if (!res.ok) return { status: 'offline', latencyMs: null }
    const body = (await res.json()) as { status?: string }
    return {
      status: body.status === 'healthy' ? 'healthy' : 'degraded',
      latencyMs,
    }
  } catch {
    return { status: 'offline', latencyMs: null }
  }
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
}
