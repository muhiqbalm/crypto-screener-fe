/**
 * Mock-mode data (NEXT_PUBLIC_USE_MOCK_DATA=true only) for the Status bot summary,
 * GET /api/v1/lab/bot/status. Lazy-imported by ./index, never part of a production bundle.
 * Shape follows src/lab/botstatus.py; the values are illustrative, not real.
 */
import type { BotStatus } from '@/lib/api/types/bot'

const H4 = 4 * 3600 * 1000
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z')

export function mockBotStatus(now: number = Date.now()): BotStatus {
  const lastClose = Math.floor(now / H4) * H4
  const last = { at: iso(lastClose + 3000), symbol: 'ETHUSDT', action: 'open' as const, side: 'short' as const, status: 'success' }
  return {
    generated_at: iso(now),
    window_days: 7,
    available: true,
    reason: null,
    active_accounts: 1,
    accounts: [
      {
        label: 'Rosyade',
        account_active: true,
        webhook_active: true,
        webhook_since: '2026-10-13T05:00:00Z',
        exchanges: ['binance'],
        last_alert: last,
        alerts_window: 6,
        failed_window: 0,
        rejected_window: 0,
      },
      {
        label: 'fa•••@bmtm.io',
        account_active: true,
        webhook_active: false,
        webhook_since: null,
        exchanges: [],
        last_alert: null,
        alerts_window: 0,
        failed_window: 0,
        rejected_window: 0,
      },
    ],
    last_alert: { ...last, label: 'Rosyade' },
  }
}

/** Returns `{ value }` when this module serves the request, null otherwise. */
export function botMock(method: string, fullPath: string): { value: unknown } | null {
  if (method !== 'GET' || fullPath.split('?')[0] !== '/api/v1/lab/bot/status') return null
  return { value: mockBotStatus() }
}
