/**
 * Shapes returned by the backend's src/services/intel_service.py
 * (GET /api/v1/intel/whales and GET /api/v1/intel/news).
 *
 * NOTE: the backend currently mixes live values with hardcoded placeholders
 * (e.g. whaleVolume24h, exchangeNetFlow, fallback ratios/trades/news). The FE
 * views only render the fields that are actually derived from live sources;
 * see the filtering helpers in the whale and news views.
 */

export interface TopTraderRatio {
  symbol: string
  longPct: number
  shortPct: number
  lsRatio: number | null
  /** "Live FAPI" when fetched, "Cached" when the backend used its static fallback. */
  updated: string
}

export interface WhaleTrade {
  id: string
  timestamp: string
  symbol: string
  amount: string
  usdValue: string
  from: string
  to: string
  /** "outflow" = taker buy, "inflow" = taker sell (see intel_service.py). */
  type: 'inflow' | 'outflow' | 'transfer'
  confidence: number
  catalyst: string
}

export interface IntelWhalesResponse {
  whaleVolume24h?: string
  whaleVolumeChange?: string
  exchangeNetFlow?: string
  topTraderBias?: string
  smartMoneyStance?: string
  topTraderRatios?: TopTraderRatio[]
  whaleTransactions?: WhaleTrade[]
  source?: string
  /** Unix epoch seconds when the backend built this snapshot. */
  cachedAt?: number
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  sourceType: 'tier1' | 'chain' | 'macro'
  timestamp: string
  category: 'Macro' | 'Whale' | 'DeFi' | 'Regulatory' | 'Catalyst'
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  impactScore: number
  affectedSymbols: string[]
  readTime: string
  linkUrl: string
}

export interface IntelNewsResponse {
  fearAndGreed?: { value: number; classification: string }
  catalystBias?: string
  news?: NewsItem[]
  source?: string
  cachedAt?: number
}
