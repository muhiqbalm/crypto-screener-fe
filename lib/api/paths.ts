export const PATHS = {
  // Screener
  screenerSummary: '/api/v1/screener/summary',

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
} as const
