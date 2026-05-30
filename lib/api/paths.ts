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
  trades: '/trading/users/me/trades',
} as const
