/**
 * Strategy Lab API types — mirror the `/api/v1/lab` contract exactly.
 * Numbers the backend may not have yet (e.g. a run that is still queued) are
 * typed `| null` so the UI renders "—" instead of inventing a value.
 */

/** Backend ids are integers today; accept strings so URL params compare via sameId(). */
export type LabId = string | number

export function sameId(a: LabId | null | undefined, b: LabId | null | undefined): boolean {
  return a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b)
}

export type LabParamType = 'int' | 'float' | 'bool' | 'choice'
export type LabParamValue = number | boolean | string

export interface LabParamSpec {
  key: string
  label: string
  type: LabParamType
  default: LabParamValue
  min?: number | null
  max?: number | null
  step?: number | null
  choices?: string[] | null
  group: string
  /** Real backend: true for the 12 "main" params the optimizer may search. */
  tunable?: boolean
  /** Optional explanation from the template schema (Indonesian). */
  help?: string | null
}

export interface LabTemplate {
  id: string
  name: string
  description: string
  timeframes: string[]
  params: LabParamSpec[]
}

export interface LabMeResponse {
  is_admin: boolean
}

export interface LabSymbol {
  symbol: string
  has_data: boolean
  timeframes: string[]
}

export type LabRunMode = 'backtest' | 'validate' | 'optimize'
export type LabScanMode = 'validate' | 'optimize'
export type LabStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'
export type LabVerdict = 'PASS' | 'FAIL' | null

export interface LabCosts {
  commission_pct: number
  slippage_pct: number
  funding: boolean
}

export interface LabOptimizeSearch {
  params: string[]
  ranges: Record<string, [number, number]>
}

export interface LabRunCreateRequest {
  template_id: string
  symbol: string
  timeframe: string
  start?: string
  end?: string
  params: Record<string, LabParamValue>
  costs: LabCosts
  mode: LabRunMode
  /** Optimize only (backend max 60). */
  n_trials?: number
  /** Optimize only: restrict the search to these keys / ranges. */
  search?: LabOptimizeSearch
  /** Provenance: backend links the run only when params equal the preset's. */
  preset_id?: LabId
}

export interface LabRunCreateResponse {
  run_id: LabId
  job_id: LabId
  preset_linked?: boolean
}

export interface LabRunSummary {
  id: LabId
  template_id: string
  symbol: string
  timeframe: string
  mode: LabRunMode
  status: LabStatus
  verdict: LabVerdict
  net_return_pct: number | null
  profit_factor: number | null
  max_dd_pct: number | null
  trades: number | null
  created_at: string
}

export interface LabCheck {
  name: string
  label: string
  value: number | string | boolean | null
  threshold: number | string | boolean | null
  passed: boolean
}

export type LabMetrics = Record<string, number | string | boolean | null>

export interface LabRunDetail extends LabRunSummary {
  params: Record<string, LabParamValue>
  costs: LabCosts
  start: string | null
  end: string | null
  metrics: LabMetrics
  oos_metrics: LabMetrics | null
  checks: LabCheck[]
  holdout_touches: number
  engine_commit: string | null
  error: string | null
  best_params?: Record<string, LabParamValue> | null
  job_id?: LabId | null
  holdout_start?: string | null
  honesty_version?: string | null
  finished_at?: string | null
  sensitivity?: LabSensitivity | null
  // optimize-only (backend e8b6353)
  search?: LabOptimizeSearch | null
  n_trials?: number | null
  trials_done?: number | null
  objective?: string | null
  top_trials?: LabTopTrial[] | null
  /** How often this template+symbol was tried across timeframes (data-snooping warning). */
  snooping?: LabSnooping | null
  /** Preset this run was started from (unchanged params), and presets saved from it. */
  preset?: { id: LabId; name: string } | null
  saved_as?: string[]
}

/** metrics.costs / oos_metrics.costs: what the costs eat on this timeframe. */
export interface LabCostProfile {
  round_trip_cost_pct: number | null
  avg_bar_range_pct: number | null
  cost_to_bar_range: number | null
  zero_cost_net_return_pct: number | null
  zero_cost_profit_factor: number | null
  cost_drag_pct: number | null
  fees_paid: number | null
  trades_per_month: number | null
}

export interface LabSnooping {
  timeframes_tested: string[]
  holdout_touches_all_tf: number
  validated_runs_all_tf: number
  optimizer_trials_all_tf: number
}

export interface LabTopTrial {
  rank: number
  trial: number
  score: number | null
  /** Searched keys only. */
  params: Record<string, LabParamValue>
  metrics: {
    net_return_pct?: number | null
    profit_factor?: number | null
    max_dd_pct?: number | null
    trades?: number | null
    sharpe?: number | null
    profitable_segments?: number | null
    segments?: number | null
  } | null
  error?: string | null
}

interface LabSensitivityRow {
  param: string
  base: number | string | boolean | null
  stability: number | null
  profitable_fraction: number | null
  fragile: boolean
}

export interface LabSensitivity {
  params: LabSensitivityRow[]
  unstable: number
  threshold?: number
  steps?: number[]
}

export type LabSegment = 'is' | 'oos' | 'holdout'

export interface LabEquityPoint {
  t: string
  equity: number
  segment: LabSegment
}

export interface LabTrade {
  entry_time: string
  exit_time: string | null
  side: string
  entry_price: number
  exit_price: number | null
  pnl_pct: number | null
  return_on_equity_pct: number | null
  exit_reason: string | null
}

export interface LabScanCreateRequest {
  template_id: string
  symbols: string[]
  timeframes: string[]
  params?: Record<string, LabParamValue>
  costs: LabCosts
  mode: LabScanMode
  n_trials?: number
  search?: LabOptimizeSearch
  /** Per-timeframe start date (falls back to `start`). */
  start?: string
  starts?: Record<string, string>
  /** Every cell uses this preset's params. */
  preset_id?: LabId
  /** Per cell: best PASS preset for that coin+TF, else `params`. */
  use_best_presets?: boolean
}

export interface LabScanCreateResponse {
  scan_id: LabId
}

export interface LabScanRow {
  symbol: string
  timeframe: string
  run_id: LabId | null
  status: LabStatus
  verdict: LabVerdict
  oos_net_return_pct: number | null
  oos_profit_factor: number | null
  oos_max_dd_pct: number | null
  trades: number | null
  preset?: { id: LabId; name: string } | null
}

export interface LabProgress {
  done: number
  total: number
}

export interface LabScanDetail {
  id: LabId
  status: LabStatus
  progress: LabProgress
  rows: LabScanRow[]
  /** Optional extras the list endpoint may include. */
  template_id?: string
  mode?: LabScanMode
  created_at?: string
  /** Queue position + ETA while unfinished (null when done). */
  queue?: { queued: number; running: number; queue_position: number | null; eta_s: number | null } | null
}

export interface LabJobProgress {
  stage?: string | null
  done?: number | null
  total?: number | null
  trials_done?: number | null
  trials_total?: number | null
}

export interface LabJob {
  id: LabId
  status: LabStatus
  progress?: LabJobProgress | number | null
  error?: string | null
  // queue / ETA while queued or running (seconds from now)
  timeout_s?: number | null
  queue_position?: number | null
  est_s?: number | null
  eta_start_s?: number | null
  eta_done_s?: number | null
  elapsed_s?: number | null
  started_at?: string | null
}

export interface LabDataStatus {
  symbol: string
  timeframe: string
  first: string | null
  last: string | null
  rows: number
}

// ---------------------------------------------------------------------------
// Live chart overlay (klines + watches)
// ---------------------------------------------------------------------------

export interface LabKline {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface LabWatchCreateRequest {
  template_id: string
  symbol: string
  timeframe: string
  params: Record<string, LabParamValue>
  costs: LabCosts
}

export interface LabWatchCreateResponse {
  watch_id: LabId
}

/** List shape is not pinned down in the contract; extra fields are optional. */
export interface LabWatch {
  id: LabId
  template_id: string
  symbol: string
  timeframe: string
  params?: Record<string, LabParamValue>
  created_at?: string
  autopaper?: { account_id: LabId | null; enabled: boolean } | null
}

export interface LabWatchPosition {
  side: string
  entry_price: number
  entry_time: string
  sl: number | null
  tp: number | null
}

export interface LabWatchTrade {
  entry_time: string
  exit_time: string | null
  side: string
  entry_price: number
  exit_price: number | null
  exit_reason: string | null
}

export interface LabWatchSignal {
  time: string
  action: string
  side: string | null
  price: number | null
}

export interface LabWatchState {
  watch_id: LabId
  computed_at: string
  last_bar: string | null
  position: LabWatchPosition | null
  recent_trades: LabWatchTrade[]
  last_signal: LabWatchSignal | null
}

// ---------------------------------------------------------------------------
// Paper trading + journal (PAPER ONLY — never a real order)
// ---------------------------------------------------------------------------

export interface PaperAccountCreateRequest {
  name: string
  starting_balance: number
  risk_pct: number
  leverage_max: number
}

export interface PaperAccountCreateResponse {
  id: LabId
}

export interface PaperPosition {
  id: LabId
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  entry_time?: string
  qty: number
  sl: number | null
  tp: number | null
  watch_id?: LabId | null
  mark_price?: number | null
  unrealized_pnl?: number | null
}

export interface PaperAccount {
  id: LabId
  name: string
  balance: number
  equity: number
  /** Contract says `open_positions`; may be a count or a list. */
  open_positions: number | PaperPosition[]
  realized_pnl: number
  created_at: string
  /** Not in the list contract; used for the size preview when present. */
  risk_pct?: number | null
  leverage_max?: number | null
  starting_balance?: number | null
}

export type PaperSide = 'long' | 'short'

export interface PaperOrderRequest {
  account_id: LabId
  symbol: string
  side: PaperSide
  sl: number
  tp?: number
  qty?: number
  note?: string
  watch_id?: LabId
}

export interface AutopaperRequest {
  account_id: LabId
  enabled: boolean
}

export type JournalSource = 'paper_manual' | 'paper_auto' | 'bot'

export interface JournalEntry {
  id: LabId
  account_id: LabId | null
  source: JournalSource
  watch_id: LabId | null
  run_id: LabId | null
  symbol: string
  side: string
  entry_time: string
  entry_price: number
  exit_time: string | null
  exit_price: number | null
  qty: number | null
  fees: number | null
  funding: number | null
  sl: number | null
  tp: number | null
  risk_amount: number | null
  pnl: number | null
  r_multiple: number | null
  exit_reason: string | null
  notes: string | null
  tags: string[] | null
}

export interface JournalFilters {
  account_id?: LabId
  source?: JournalSource | ''
  symbol?: string
  from?: string
  to?: string
}

export interface JournalPatchRequest {
  notes: string
  tags: string[]
}

export type BreakdownRow = Record<string, number | string | null>

export interface JournalStats {
  trades: number
  winrate: number | null
  avg_r: number | null
  expectancy_r: number | null
  profit_factor: number | null
  net_pnl: number | null
  max_dd_pct: number | null
  equity_curve: { t: string; equity: number }[]
  /** Shape not pinned down: either a list of rows or a map keyed by name. */
  by_symbol: BreakdownRow[] | Record<string, BreakdownRow> | null
  by_source: BreakdownRow[] | Record<string, BreakdownRow> | null
}

/** Paper vs backtest comparison for a watch; shape not pinned down. */
export type WatchCompare = Record<string, unknown>
