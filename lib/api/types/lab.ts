/**
 * Strategy Lab API types — mirror the `/api/v1/lab` contract exactly.
 * Numbers the backend may not have yet (e.g. a run that is still queued) are
 * typed `| null` so the UI renders "—" instead of inventing a value.
 */

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

export interface LabRunCreateRequest {
  template_id: string
  symbol: string
  timeframe: string
  start?: string
  end?: string
  params: Record<string, LabParamValue>
  costs: LabCosts
  mode: LabRunMode
}

export interface LabRunCreateResponse {
  run_id: string
  job_id: string
}

export interface LabRunSummary {
  id: string
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
  /** Not in the written contract; used for the cancel button when present. */
  job_id?: string | null
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
}

export interface LabScanCreateResponse {
  scan_id: string
}

export interface LabScanRow {
  symbol: string
  timeframe: string
  run_id: string | null
  status: LabStatus
  verdict: LabVerdict
  oos_net_return_pct: number | null
  oos_profit_factor: number | null
  oos_max_dd_pct: number | null
  trades: number | null
}

export interface LabProgress {
  done: number
  total: number
}

export interface LabScanDetail {
  id: string
  status: LabStatus
  progress: LabProgress
  rows: LabScanRow[]
  /** Optional extras the list endpoint may include. */
  template_id?: string
  mode?: LabScanMode
  created_at?: string
}

export interface LabJob {
  id: string
  status: LabStatus
  progress?: LabProgress | number | null
  error?: string | null
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
  watch_id: string
}

/** List shape is not pinned down in the contract; extra fields are optional. */
export interface LabWatch {
  id: string
  template_id: string
  symbol: string
  timeframe: string
  params?: Record<string, LabParamValue>
  created_at?: string
  autopaper?: { account_id: string | null; enabled: boolean } | null
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
  watch_id: string
  computed_at: string
  last_bar: string | null
  position: LabWatchPosition | null
  recent_trades: LabWatchTrade[]
  last_signal: LabWatchSignal | null
}
