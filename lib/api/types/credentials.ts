/**
 * TypeScript mirrors of credential and balance models from
 * src/trading/user_models.py
 */

export type Exchange = 'binance' | 'okx'

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export interface CredentialUpsertRequest {
  exchange: Exchange
  api_key: string
  secret: string
  api_passphrase?: string | null // required for OKX, optional for Binance
}

export interface CredentialSummaryResponse {
  exchange: string
  is_configured: boolean
  created_at: string // ISO 8601
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export interface ExchangeBalanceResponse {
  exchange: string
  currency: string
  free: number
  used: number
  total: number
  account_type: string // "trading" | "funding" | "default"
}

export interface BalanceResponse {
  balances: ExchangeBalanceResponse[]
}

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

export interface OpenPositionResponse {
  symbol: string
  side: string           // "long" | "short"
  entry_price: number
  quantity: number
  exchange: string
  mark_price: number | null
  unrealized_pnl: number | null
  unrealized_pnl_pct: number | null
  liquidation_price: number | null
  leverage: number | null
}

export interface ClosedPositionResponse {
  id: string
  symbol: string
  side: string           // "long" | "short"
  entry_price: number
  exit_price: number
  quantity: number
  opened_at: string      // ISO 8601
  closed_at: string      // ISO 8601
  exchange: string
}
