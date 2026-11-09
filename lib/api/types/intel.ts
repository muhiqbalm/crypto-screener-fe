/**
 * Shapes returned by the backend's src/services/intel_service.py
 * (GET /api/v1/intel/whales and GET /api/v1/intel/news).
 *
 * The backend never fabricates values: anything it cannot source is null and
 * listed in `unavailableFields`; `status` summarises the snapshot.
 */

export type IntelStatus = 'live' | 'partial' | 'unavailable'

export interface TopTraderRatio {
  symbol: string
  longPct: number
  shortPct: number
  lsRatio: number | null
  updated: string
  /** Binance sample time (epoch ms). */
  timestamp?: number | null
}

export interface WhaleTrade {
  /** "tx-fapi-{BASE}-{aggId}" */
  id: string
  /** Real relative age ("2 mins ago") or null. */
  timestamp: string | null
  /** Trade time (epoch ms) or null. */
  tradeTime?: number | null
  symbol: string
  amount: string
  usdValue: string
  usdValueRaw?: number
  side?: 'BUY' | 'SELL'
  from: string
  to: string
  /** Legacy: "outflow" = taker buy, "inflow" = taker sell. */
  type: 'inflow' | 'outflow' | 'transfer'
  confidence: number
  catalyst: string
}

export interface IntelWhalesResponse {
  status?: IntelStatus
  unavailableFields?: string[]
  whaleVolume24h?: string | null
  whaleVolumeChange?: string | null
  exchangeNetFlow?: string | null
  topTraderBias?: string | null
  smartMoneyStance?: string | null
  smartMoneyStanceCode?: 'bullish' | 'bearish' | 'neutral' | null
  topTraderRatios?: TopTraderRatio[]
  whaleTransactions?: WhaleTrade[]
  largeTradeBuyUsd?: number | null
  largeTradeSellUsd?: number | null
  largeTradeNetUsd?: number | null
  largeTradeWindowSeconds?: number | null
  largeTradeMinUsd?: number | null
  source?: string
  /** Unix epoch seconds when the backend built this snapshot. */
  cachedAt?: number
}

export interface NewsItem {
  /** "live-news-{hash}" */
  id: string
  title: string
  summary: string
  source: string
  sourceType: 'tier1' | 'chain' | 'macro'
  /** Real relative age derived from the RSS pubDate, or null. */
  timestamp: string | null
  /** ISO 8601 publication time, or null. */
  publishedAt?: string | null
  category: 'Macro' | 'Whale' | 'DeFi' | 'Regulatory' | 'Catalyst'
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  impactScore: number
  affectedSymbols: string[]
  readTime: string | null
  linkUrl: string | null
}

export interface IntelNewsResponse {
  status?: IntelStatus
  unavailableFields?: string[]
  fearAndGreed?: { value: number; classification: string | null } | null
  /** Signed net bullish-minus-bearish headline share, e.g. "+25%", or null. */
  catalystBias?: string | null
  catalystBiasBasis?: string | null
  news?: NewsItem[]
  source?: string
  cachedAt?: number
}
