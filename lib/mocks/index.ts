import { PATHS } from '@/lib/api/paths'
import { MOCK_SCREENER } from './screener'
import { MOCK_WEBHOOK_CONFIG } from './webhook'
import { MOCK_TRADE_LOG } from './trades'
import { MOCK_BALANCE } from './balance'
import { MOCK_OPEN_POSITIONS, MOCK_POSITIONS_HISTORY } from './positions'

export async function getMock(method: string, path: string): Promise<unknown> {
  // Resolve on next microtask to simulate async
  await Promise.resolve()

  if (method === 'GET' && path === PATHS.screenerSummary) return MOCK_SCREENER
  if (method === 'GET' && path === PATHS.webhookConfig) return MOCK_WEBHOOK_CONFIG
  if (method === 'POST' && path === PATHS.webhookConfig) return MOCK_WEBHOOK_CONFIG
  if (method === 'PATCH' && path === PATHS.webhookConfig) return MOCK_WEBHOOK_CONFIG
  if (method === 'DELETE' && path === PATHS.webhookConfig) return undefined
  if (method === 'GET' && path === PATHS.trades) return MOCK_TRADE_LOG
  if (method === 'GET' && path === PATHS.balance) return MOCK_BALANCE
  if (method === 'GET' && path === PATHS.positions) return MOCK_OPEN_POSITIONS
  if (method === 'GET' && path === PATHS.positionsHistory) return MOCK_POSITIONS_HISTORY

  throw new Error(`No mock for ${method} ${path}`)
}
