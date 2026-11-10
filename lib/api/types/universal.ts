/**
 * Universal v0 (multi-coin portfolio) + Koin Terkuat — mirrors
 * src/api/universal_routes.py. Runs themselves use the generic Lab run
 * endpoints (LabRunDetail) with template_id "universal_v0" / symbol "UNIVERSE".
 */
import type { LabCosts, LabId, LabOptimizeSearch, LabParamSpec, LabParamValue, LabRunMode } from './lab'

export const UNIVERSAL_TEMPLATE_ID = 'universal_v0'

export interface UniversalParamSpec extends LabParamSpec {
  help?: string
}

export interface UniversalSchema {
  id: string
  name: string
  description: string
  timeframes: string[]
  params: UniversalParamSpec[]
  defaults: Record<string, LabParamValue | string[]>
  universe: string[]
  tunable: string[]
  holdout_lock: { holdout_start: string; touches: number } | null
}

export type UniversalParams = Record<string, LabParamValue | string[]>

export interface UniversalRunCreateRequest {
  params: UniversalParams
  costs: LabCosts
  mode: LabRunMode
  start?: string
  end?: string
  n_trials?: number
  search?: LabOptimizeSearch
}

export interface UniversalContribRow {
  symbol: string
  pnl: number | null
  pnl_pct_of_initial: number | null
  trades: number
  win_rate_pct: number | null
  fees: number | null
  slippage: number | null
  funding: number | null
  bars_held: number
  longs: number
  shorts: number
}

export interface UniversalContrib {
  full: UniversalContribRow[]
  holdout: UniversalContribRow[] | null
}

export interface UniversalTrade {
  symbol: string
  side: 'long' | 'short'
  entry_time: string
  exit_time: string
  entry_price: number | null
  exit_price: number | null
  pnl: number | null
  pnl_pct: number | null
  exit_reason: string
  fees: number | null
  funding: number | null
  bars_held: number
}

export interface StrengthRow {
  symbol: string
  rank: number | null
  price: number | null
  score: number | null
  ret_1d_pct: number | null
  ret_7d_pct: number | null
  ret_30d_pct: number | null
  ret_90d_pct: number | null
  vol_ann_pct: number | null
  trend: 'up' | 'down' | null
  ema_dist_pct: number | null
  donchian_pos: number | null
  funding_7d_apr_pct: number | null
  eligible: boolean
  target_weight_pct: number | null
  in_portfolio: boolean
  spark: (number | null)[]
  last_bar: string | null
}

export interface StrengthResponse {
  computed_at: string | null
  last_bar: string | null
  last_bar_close?: string | null
  params?: Record<string, number>
  donchian_days?: number
  rows: StrengthRow[]
  refresh: { job_id: LabId; status: string; created_at: string } | null
}

export interface UniversalTarget {
  symbol: string
  weight_pct: number
  score: number | null
  vol_ann_pct: number | null
}

export interface UniversalOrder {
  symbol: string
  action: 'open' | 'add' | 'reduce' | 'close'
  side: 'long' | 'short'
  qty: number
  price: number
  weight_from: number
  weight_to: number
  pnl?: number | null
}

export interface UniversalRebalance {
  id: LabId
  bar: string
  targets: UniversalTarget[]
  orders: UniversalOrder[]
  equity: number | null
  note: string | null
  created_at: string
}

export interface UniversalWatchPosition {
  id: LabId
  symbol: string
  side: 'long' | 'short'
  qty: number
  entry_price: number
  mark_price: number | null
  unrealized_pnl: number | null
  source: string
}

export interface UniversalWatch {
  id: LabId
  name: string | null
  params: UniversalParams
  costs: LabCosts
  account_id: LabId | null
  autopaper: boolean
  telegram: boolean
  active: boolean
  run_id: LabId | null
  created_at: string
  last_rebalance_bar: string | null
  account: {
    id: LabId
    name: string
    balance: number
    equity: number
    starting_balance: number
    realized_pnl: number
    open_positions: UniversalWatchPosition[]
  } | null
  state: {
    computed_at: string
    last_bar: string | null
    targets: UniversalTarget[]
    ranks: { symbol: string; score: number | null; eligible: boolean; trend: string | null }[]
    next_rebalance: string | null
    error: string | null
  } | null
  last_rebalance: UniversalRebalance | null
}

export interface UniversalWatchCreateRequest {
  name?: string
  params: UniversalParams
  costs: LabCosts
  account_id?: LabId | null
  starting_balance?: number
  autopaper: boolean
  telegram: boolean
  run_id?: LabId | null
}

export interface UniversalWatchPatch {
  name?: string
  autopaper?: boolean
  telegram?: boolean
  account_id?: LabId
  active?: boolean
}
