import { PATHS } from '@/lib/api/paths'
import { ApiError } from '@/lib/api/errors'
import { MOCK_SCREENER } from './screener'
import { MOCK_WEBHOOK_CONFIG } from './webhook'
import { MOCK_TRADE_LOG } from './trades'
import { MOCK_BALANCE } from './balance'
import { MOCK_OPEN_POSITIONS, MOCK_POSITIONS_HISTORY } from './positions'

export async function getMock(method: string, path: string, body?: unknown): Promise<unknown> {
  // Resolve on next microtask to simulate async
  await Promise.resolve()

  // QA: non-admin view on demand (lib/mocks/home.ts mockRoleIsMember).
  {
    const o = (await import('./home')).memberOverride(method, path)
    if (o && 'value' in o) return o.value
    if (o) throw new ApiError('auth', 403)
  }

  // Status bot summary (GET /api/v1/lab/bot/status); see lib/mocks/bot.ts
  const bot = (await import('./bot')).botMock(method, path)
  if (bot) return bot.value

  // Market pages + Status bot sections (intel, live-check, shadow); see lib/mocks/pasar-bot.ts
  const pasarBot = (await import('./pasar-bot')).pasarBotMock(method, path)
  if (pasarBot) return pasarBot.value

  if (path.startsWith('/api/v1/lab/')) {
    const koin = await (await import('./outlook')).getOutlookMock(method, path)
    if (koin !== undefined) return koin
    const { getLabMock } = await import('./lab')
    try {
      return await getLabMock(method, path, body)
    } catch (err) {
      // Beranda / ribbon fallback mocks (lib/mocks/home.ts) for paths no page mock covers.
      const hit = (await import('./home')).homeMock(method, path)
      if (hit !== undefined) return hit
      throw err
    }
  }

  if (method === 'GET' && path === PATHS.screenerSummary) return MOCK_SCREENER
  // real ledger output (production lab.db copy, 2026-11-11)
  if (method === 'GET' && path === PATHS.screenerTrackRecord) return (await import('./track-record.json')).default
  if (method === 'GET' && path === PATHS.webhookConfig) return MOCK_WEBHOOK_CONFIG
  if (method === 'POST' && path === PATHS.webhookConfig) return MOCK_WEBHOOK_CONFIG
  if (method === 'PATCH' && path === PATHS.webhookConfig) return MOCK_WEBHOOK_CONFIG
  if (method === 'DELETE' && path === PATHS.webhookConfig) return undefined
  if (method === 'GET' && path === PATHS.trades) return MOCK_TRADE_LOG
  if (method === 'GET' && path === PATHS.balance) return MOCK_BALANCE
  if (method === 'GET' && path === PATHS.positions) return MOCK_OPEN_POSITIONS
  if (method === 'GET' && path === PATHS.positionsHistory) return MOCK_POSITIONS_HISTORY
  // Akun & koneksi (mock mode only): one stored key, a demo profile.
  if (method === 'GET' && path === PATHS.credentials) return [{ exchange: 'binance', is_configured: true, created_at: '2026-10-01T00:00:00Z' }]
  if (method === 'GET' && path === PATHS.userMe)
    return { id: 'mock-user', email: 'demo@bmtm.io', name: 'Demo', telegram_chat_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' }

  const home = (await import('./home')).homeMock(method, path)
  if (home !== undefined) return home

  throw new Error(`No mock for ${method} ${path}`)
}
