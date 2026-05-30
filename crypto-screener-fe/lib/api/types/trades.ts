export type TradeStatus = 'success' | 'failed' | 'pending' | 'rejected'
export type TradeSide = 'long' | 'short'
export type TradeAction = 'open' | 'close'

export interface TradeLogResponse {
  id: string
  symbol: string
  action: TradeAction
  side: TradeSide
  exchange: 'binance' | 'okx'
  size_value: number
  status: TradeStatus
  order_id: string | null
  fill_price: number | null
  filled_quantity: number | null
  error_details: string | null
  created_at: string // ISO 8601
}
