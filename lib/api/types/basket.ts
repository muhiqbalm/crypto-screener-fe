/**
 * GET /api/v1/lab/baskets and /api/v1/lab/baskets/{id} (admin-only, read-only).
 * A basket = ONE strategy with default params on a fixed, pre-registered coin list; every coin's
 * watch auto-papers into ONE simulated account (docs/riset-2026-11-12/08-praregistrasi-basket.md).
 */
import type { ArenaDrift, ArenaLastAction, ArenaOpenPosition, ArenaStats } from './arena'

/** Pre-registered outcome (BELUM = still collecting data). */
export type BasketOutcome = 'BELUM' | 'LANJUT' | 'LULUS' | 'GAGAL' | 'TIDAK_SAH' | 'TIDAK_CUKUP_DATA'

export type BasketCoinStatus =
  | 'posisi_terbuka'
  | 'menunggu_sinyal_baru'
  | 'menunggu_sinyal'
  | 'belum_dihitung'
  | 'error'
  | 'paper_mati'
  | 'watch_hilang'

export interface BasketSizing {
  mode: 'risk' | 'slot_engine' | 'slot_fixed'
  risk_pct: number | null
  slots: number | null
  notional_x?: number | null
  max_position_notional_x: number
  gross_cap_x: number
  max_open: number
  min_fill_frac: number
  kill_dd_pct: number
}

export interface BasketInfo {
  id: number
  name: string
  label: string
  title: string | null
  template_id: string
  template_label: string
  timeframe: string
  n_coins: number
  coins: string[]
  sizing: BasketSizing
  active: boolean
  created_at: string
  prereg: { id?: string; doc?: string; json?: string; commit?: string | null } | null
}

export interface BasketStrategyPosition {
  side: string | null
  entry_price: number | null
  /** Open time of the signal bar (the engine fills at its close). */
  entry_time: string
  opened_before_paper: boolean
  mirrored: boolean
}

export interface BasketCoin {
  symbol: string
  coin: string
  watch_id: number
  status: BasketCoinStatus
  trades: number
  wins: number
  pnl: number
  last_exit: string | null
  open_position: ArenaOpenPosition | null
  strategy_position: BasketStrategyPosition | null
  skips: number
  last_eval_at: string | null
  last_bar: string | null
  error: string | null
}

export interface BasketGate {
  trades: number
  need_trades: number
  coins: number
  need_coins: number
  entry_days: number
  need_entry_days: number
  days: number
  need_days: number
}

export interface BasketMissed {
  symbol: string
  coin: string
  side: string | null
  signal_time: string
  reason: string
}

export interface BasketFidelity {
  expected: number
  matched: number
  coverage: number | null
  closed_pairs: number
  median_abs_diff_pp: number | null
  engine_closed: number
  engine_pf: number | null
  engine_pf_infinite: boolean
  extra_paper: number
  coverage_ok: boolean
  diff_ok: boolean
  missed?: BasketMissed[]
}

export interface BasketCheckpoint {
  checkpoint: 1 | 2
  at: string
  trades: number
  pf: number | null
  pf_infinite: boolean
  pf_decision: BasketOutcome | null
  engine_pf: number | null
  engine_decision: BasketOutcome | null
  dd_pct: number | null
  dd_limit_pct: number | null
  dd_ok: boolean | null
  fidelity: BasketFidelity
  invalid_reasons: string[]
  verdict: BasketOutcome
}

export interface BasketEvaluation {
  status: BasketOutcome
  deadline: string
  kill: { at: string; dd_pct?: number; limit_pct?: number; equity?: number; peak?: number } | null
  checkpoints: BasketCheckpoint[]
  next: { checkpoint: 1 | 2; due: string | null; earliest: string } | null
}

/** Frozen reference backtest, computed after the pre-registration was locked. */
export interface BasketExpect {
  trades: number
  months: number
  trades_per_month: number | null
  win_rate_pct: number | null
  profit_factor: number | null
  net_return_pct: number | null
  per_trade_ret_pct: number | null
  max_dd_pct: number | null
  mc_dd_p95_pct: number | null
  sharpe: number | null
  avg_hold_days: number | null
  max_gross_x?: number | null
  gross_cap_binds?: number | null
  coins_traded?: number | null
  days_to_30_median?: number | null
  days_to_30_p10?: number | null
  days_to_30_p90?: number | null
  days_to_checkpoint1_median?: number | null
  days_to_checkpoint1_p90?: number | null
  start: string
  end: string
  sizing_rule?: string | null
  contaminated?: boolean
  source_note?: string | null
}

export interface BasketRow {
  basket: BasketInfo
  account: { id: number; name: string; starting_balance: number; created_at: string } | null
  stats: ArenaStats | null
  progress: { n: number; of: number }
  gate: BasketGate
  evaluation: BasketEvaluation
  coins: BasketCoin[]
  waiting: { n: number; coins: string[] }
  open_positions: number
  fidelity: BasketFidelity
  expect: BasketExpect | null
  drift: ArenaDrift | null
  last_action: ArenaLastAction | null
  /** Recent equity points (oldest first), for a sparkline. */
  spark: number[]
}

export interface BasketRules {
  prereg_id: string
  doc: string
  json: string
  commit: string
  review_min_trades: number
  checkpoints: Record<string, { min_trades: number; min_days: number; min_coins: number; min_entry_days: number }>
  deadline_days: number
  pf_fail: Record<string, number>
  pf_pass: number
  dd_limit_floor_pct: number
  dd_limit_mult: number
  kill_dd_pct: number
  fidelity_coverage_min: number
  fidelity_max_median_abs_diff_pp: number
  entry_window_s: [number, number]
}

export interface BasketReport {
  generated_at: string
  rules: BasketRules
  rows: BasketRow[]
}

export interface BasketTrade {
  id: number
  symbol: string
  side: string
  entry_time: string
  entry_price: number
  exit_time: string
  exit_price: number
  qty: number
  pnl: number | null
  r_multiple: number | null
  exit_reason: string | null
}

export interface BasketEvent {
  id: number
  basket_id: number
  watch_id: number | null
  symbol: string | null
  kind: 'skip' | 'shrink' | 'kill'
  reason: string
  bar: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export interface BasketDetail extends BasketRow {
  generated_at: string
  curve: { t: string; equity: number }[]
  trades: BasketTrade[]
  events: BasketEvent[]
  rules: BasketRules
}
