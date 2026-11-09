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
  labRun: (id: string) => `/api/v1/lab/runs/${encodeURIComponent(id)}`,
  labRunEquity: (id: string) => `/api/v1/lab/runs/${encodeURIComponent(id)}/equity`,
  labRunTrades: (id: string) => `/api/v1/lab/runs/${encodeURIComponent(id)}/trades`,
  labScans: '/api/v1/lab/scans',
  labScan: (id: string) => `/api/v1/lab/scans/${encodeURIComponent(id)}`,
  labJob: (id: string) => `/api/v1/lab/jobs/${encodeURIComponent(id)}`,
  labJobCancel: (id: string) => `/api/v1/lab/jobs/${encodeURIComponent(id)}/cancel`,
  labDataStatus: '/api/v1/lab/data/status',
  labKlines: (symbol: string, timeframe: string, limit: number) =>
    `/api/v1/lab/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`,
  labWatches: '/api/v1/lab/watches',
  labWatch: (id: string) => `/api/v1/lab/watches/${encodeURIComponent(id)}`,
  labWatchState: (id: string) => `/api/v1/lab/watches/${encodeURIComponent(id)}/state`,
} as const
