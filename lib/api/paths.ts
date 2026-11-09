import type { LabId } from './types/lab'

export const PATHS = {
  // Screener
  screenerSummary: '/api/v1/screener/summary',
  health: '/api/v1/health',

  // Auth
  authRegister: '/trading/auth/register',
  authLogin: '/trading/auth/login',
  authRefresh: '/trading/auth/refresh',
  authLogout: '/trading/auth/logout',

  // User profile
  userMe: '/trading/users/me',

  // Webhook & trades
  webhookConfig: '/trading/users/me/webhook-config',
  webhookConfigReactivate: '/trading/users/me/webhook-config/reactivate',
  trades: '/trading/users/me/trades',

  // Exchange credentials
  credentials: '/trading/users/me/credentials',
  credentialByExchange: (exchange: string) => `/trading/users/me/credentials/${exchange}`,

  // Balance
  balance: '/trading/users/me/balance',

  // Positions
  positions: '/trading/users/me/positions',
  positionsHistory: '/trading/users/me/positions/history',

  // Real Market Intelligence
  intelWhales: '/api/v1/intel/whales',
  intelNews: '/api/v1/intel/news',

  // Strategy Lab (admin only, Bearer JWT)
  labPrefix: '/api/v1/lab/',
  labMe: '/api/v1/lab/me',
  labTemplates: '/api/v1/lab/templates',
  labSymbols: '/api/v1/lab/symbols',
  labRuns: '/api/v1/lab/runs',
  labRunsList: (limit: number) => `/api/v1/lab/runs?limit=${limit}`,
  labRun: (id: LabId) => `/api/v1/lab/runs/${encodeURIComponent(String(id))}`,
  labRunEquity: (id: LabId) => `/api/v1/lab/runs/${encodeURIComponent(String(id))}/equity`,
  labRunTrades: (id: LabId) => `/api/v1/lab/runs/${encodeURIComponent(String(id))}/trades`,
  labScans: '/api/v1/lab/scans',
  labScan: (id: LabId) => `/api/v1/lab/scans/${encodeURIComponent(String(id))}`,
  labJob: (id: LabId) => `/api/v1/lab/jobs/${encodeURIComponent(String(id))}`,
  labJobCancel: (id: LabId) => `/api/v1/lab/jobs/${encodeURIComponent(String(id))}/cancel`,
  labDataStatus: '/api/v1/lab/data/status',
  labKlines: (symbol: string, timeframe: string, limit: number) =>
    `/api/v1/lab/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`,
  labWatches: '/api/v1/lab/watches',
  labWatch: (id: LabId) => `/api/v1/lab/watches/${encodeURIComponent(String(id))}`,
  labWatchState: (id: LabId) => `/api/v1/lab/watches/${encodeURIComponent(String(id))}/state`,
  labWatchAutopaper: (id: LabId) => `/api/v1/lab/watches/${encodeURIComponent(String(id))}/autopaper`,
  labWatchCompare: (id: LabId) => `/api/v1/lab/watches/${encodeURIComponent(String(id))}/compare`,

  // Paper trading + journal (PAPER ONLY)
  paperAccounts: '/api/v1/lab/paper/accounts',
  paperOrders: '/api/v1/lab/paper/orders',
  paperPositionClose: (id: LabId) => `/api/v1/lab/paper/positions/${encodeURIComponent(String(id))}/close`,
  journal: (query: string) => `/api/v1/lab/journal${query ? `?${query}` : ''}`,
  journalEntry: (id: LabId) => `/api/v1/lab/journal/${encodeURIComponent(String(id))}`,
  journalStats: (accountId?: string) =>
    `/api/v1/lab/journal/stats${accountId ? `?account_id=${encodeURIComponent(accountId)}` : ''}`,
} as const
