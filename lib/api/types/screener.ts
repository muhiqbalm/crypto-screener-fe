import type { ResponseMetadata } from './common'

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL'
export type TierClass = 'A' | 'B' | 'C'

export interface MarketOverview {
  avg_change_24h: number | null
  avg_funding_rate: number | null
  total_volume: number | null
  bullish_count: number
  bearish_count: number
  neutral_count: number
  avg_risk_adjusted_score: number | null
  tier_a_count: number
  tier_b_count: number
  tier_c_count: number
}

export interface AssetSummary {
  symbol: string
  rank: number | null
  composite_score: number | null
  signal: SignalDirection | null
  confidence_pct: number | null
  confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW' | null
}

export interface AssetDetail extends AssetSummary {
  price: number | null
  change_24h: number | null
  volume_24h: number | null
  funding_rate: number | null
  open_interest: number | null
  long_short_ratio: number | null
  reversal_score: number | null
  macd_signal: 'BUY' | 'SELL' | 'HOLD' | null
  volatility: number | null
  ic_weight: number | null
  risk_adjusted_score: number | null
  suggested_position_pct: number | null
  tier: TierClass | null
  funding_rate_signal: SignalDirection | null
  oi_signal: SignalDirection | null
}

export interface SummaryData {
  top_3_assets: AssetSummary[]
  market_overview: MarketOverview
}

export interface ScreenerResponse {
  metadata: ResponseMetadata
  summary: SummaryData
  assets: AssetDetail[] | null
}
