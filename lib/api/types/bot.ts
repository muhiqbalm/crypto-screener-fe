/**
 * "Status bot" summary — mirrors src/api/bot_routes.py / src/lab/botstatus.py.
 * Admin-only, read-only. Never contains a passphrase, key, user id, order id or error text.
 * Times are ISO strings in UTC.
 */

export type BotAlertStatus = 'success' | 'failed' | 'rejected'

export interface BotAlert {
  at: string
  symbol: string
  action: 'open' | 'close' | null
  side: 'long' | 'short' | null
  /** Raw trade_logs status; unknown values are passed through as-is. */
  status: BotAlertStatus | string | null
}

export interface BotAccount {
  /** Display name, or a masked e-mail ("ro•••@bmtm.io"). */
  label: string
  /** false = the user account itself is disabled: every alert gets 401. */
  account_active: boolean
  webhook_active: boolean
  /** When the current active webhook config was created; null when not active. */
  webhook_since: string | null
  /** Exchanges with a stored API key, e.g. ["binance"]. */
  exchanges: string[]
  /** Last alert the bot processed for this account (any symbol). */
  last_alert: BotAlert | null
  alerts_window: number
  failed_window: number
  rejected_window: number
}

export interface BotStatus {
  generated_at: string
  window_days: number
  /** false = the bot database could not be read; `reason` says why. Nothing is invented. */
  available: boolean
  reason: string | null
  /** Accounts whose webhook AND user account are active. */
  active_accounts: number
  accounts: BotAccount[]
  last_alert: (BotAlert & { label: string }) | null
}
