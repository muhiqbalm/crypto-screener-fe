'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { outlookApi } from '@/lib/api/outlook'
import { liveCheckApi } from '@/lib/api/livecheck'
import { arenaApi } from '@/lib/api/arena'
import { notificationsApi, reportApi } from '@/lib/api/report'
import { DEFAULT_INPUTS } from '@/lib/lab/outlook'

/**
 * Beranda data. Rules (audit §3.5):
 * - load once, refresh every 5 min while the tab is visible and when the tab
 *   regains focus (no fast polling);
 * - never poll exchange positions or balances (only linked);
 * - weekly report = last frozen snapshot, never the heavy running week;
 * - a 403 (no access) stops the refresh and is never shown as an error.
 * Query keys match the pages' own hooks so caches are shared.
 */
export const HOME_REFRESH_MS = 5 * 60_000
/** 42 candles × 4 h = the last 7 days. */
export const HOME_LIVECHECK_BARS = 42

export function isNoAccess(err: unknown): boolean {
  return err instanceof ApiError && err.kind === 'auth' && err.status === 403
}

// Structural param type so each query keeps its own data type inference.
const stopOnNoAccess = (q: { state: { error: unknown } }) => (isNoAccess(q.state.error) ? false : HOME_REFRESH_MS)

function calm(enabled: boolean) {
  return {
    enabled,
    refetchInterval: stopOnNoAccess,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
    retry: (count: number, err: Error) => !isNoAccess(err) && !(err instanceof ApiError && err.kind === 'not_found') && count < 1,
  } as const
}

/** Outlook rows (admin today; every account once the backend opens it, CEO decision K1). */
export function useHomeOutlook(enabled: boolean) {
  return useQuery({
    queryKey: ['lab', 'outlook', 'list', DEFAULT_INPUTS],
    queryFn: ({ signal }) => outlookApi.getOutlook(DEFAULT_INPUTS, signal),
    ...calm(enabled),
  })
}

export function useHomeLiveCheck(enabled: boolean) {
  return useQuery({
    queryKey: ['lab', 'live-check', HOME_LIVECHECK_BARS],
    queryFn: ({ signal }) => liveCheckApi.getReport(HOME_LIVECHECK_BARS, signal),
    ...calm(enabled),
  })
}

export function useHomeArena(enabled: boolean) {
  return useQuery({ queryKey: ['lab', 'arena'], queryFn: ({ signal }) => arenaApi.getReport(signal), ...calm(enabled) })
}

export function useHomeReportWeeks(enabled: boolean) {
  return useQuery({ queryKey: ['lab', 'report', 'weeks'], queryFn: ({ signal }) => reportApi.getWeeks(signal), ...calm(enabled) })
}

/** One frozen week (snapshot). Disabled until a week is known. */
export function useHomeWeeklyReport(week: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['lab', 'report', 'weekly', week ?? 'current'],
    queryFn: ({ signal }) => reportApi.getWeekly(week, signal),
    ...calm(enabled && Boolean(week)),
    // A frozen snapshot never changes.
    staleTime: 30 * 60_000,
  })
}

/** Same cache as the bell; Beranda only reads it. */
export function useHomeNotifications(enabled: boolean) {
  return useQuery({ queryKey: ['lab', 'notifications'], queryFn: ({ signal }) => notificationsApi.list(signal), ...calm(enabled) })
}

export function useHomeScreener() {
  return useQuery({ queryKey: ['screener', 'summary'], queryFn: ({ signal }) => api.getScreenerSummary(signal), ...calm(true) })
}

export function useHomeTrackRecord(enabled: boolean) {
  return useQuery({ queryKey: ['screener', 'track-record'], queryFn: ({ signal }) => api.getSignalTrackRecord(signal), ...calm(enabled) })
}

export type WebhookState = 'aktif' | 'tidak_aktif'

/**
 * Webhook on/off ONLY. The config response contains the passphrase; it is
 * dropped inside the query function, so it is never stored under this key
 * and can never be rendered from Beranda. The backend answers 404 for a
 * paused or missing config: both read "tidak aktif" (alerts are ignored).
 */
export function useHomeWebhookState(enabled = true) {
  return useQuery({
    queryKey: ['home', 'webhook-state'],
    queryFn: async ({ signal }): Promise<{ state: WebhookState }> => {
      try {
        const cfg = await api.getWebhookConfig(signal)
        return { state: cfg.is_active ? 'aktif' : 'tidak_aktif' }
      } catch (err) {
        if (err instanceof ApiError && err.kind === 'not_found') return { state: 'tidak_aktif' }
        throw err
      }
    },
    ...calm(enabled),
  })
}
