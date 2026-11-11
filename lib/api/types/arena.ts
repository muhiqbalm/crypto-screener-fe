/** GET /api/v1/lab/arena and /api/v1/lab/arena/curves (admin-only, read-only). */

export type DriftStatus = 'sesuai' | 'menyimpang' | 'belum_cukup'
export type CheckStatus = DriftStatus | 'info'

export interface ArenaPreset {
  id: number
  name: string
  label: string
  symbol: string
  coin: string
  timeframe: string
  template_id: string
  verdict: string | null
  live_reference: boolean
  family: string
  family_label: string
  base: string
}

export interface ArenaOpenPosition {
  id: number
  side: 'long' | 'short'
  entry_price: number
  entry_time: string
  qty: number
  sl: number | null
  tp: number | null
  mark_price: number | null
  mark_time: string | null
  source: string
  unrealized_pnl: number | null
}

export interface ArenaLastAction {
  time: string
  kind: 'open' | 'close'
  side: string
  price: number | null
  reason: string | null
  pnl: number | null
  source: string
}

export interface ArenaStats {
  equity: number
  balance: number
  upnl: number
  return_pct: number | null
  n_closed: number
  n_closed_manual: number
  n_entries: number
  n_open: number
  wins: number
  win_rate_pct: number | null
  win_rate_ci_pct: [number, number] | null
  avg_r: number | null
  avg_trade_ret_pct: number | null
  max_dd_pct: number | null
  sharpe: number | null
  sharpe_days: number
  days_running: number
  progress_pct: number
}

export interface ArenaBacktest {
  source: 'preset' | 'research_doc'
  source_note: string
  contaminated: boolean
  start: string
  end: string
  months: number
  trades: number
  trades_per_month: number | null
  win_rate_pct: number | null
  max_dd_pct: number | null
  mc_dd_p95_pct: number | null
  net_return_pct: number | null
  profit_factor: number | null
  sharpe: number | null
  per_trade_ret_pct: number | null
  sizing_rule: string | null
  failed_checks: string[] | null
}

export interface DriftCheck {
  key: 'frequency' | 'win_rate' | 'trade_return' | 'drawdown' | 'avg_r'
  label: string
  status: CheckStatus
  observed: number | null
  expected: number | null
  range: [number, number] | null
  note: string
}

export interface ArenaDrift {
  status: DriftStatus
  has_backtest: boolean
  checks: DriftCheck[]
  summary: string
}

export interface ArenaWatch {
  id: number
  active: boolean
  autopaper_enabled: boolean
  last_eval_at: string | null
  last_bar: string | null
  last_signal: { time?: string; action?: string; side?: string; price?: number } | null
  error: string | null
  strategy_position: {
    side: string | null
    entry_price: number | null
    entry_time: string | null
    opened_before_paper: boolean
    mirrored: boolean
  } | null
}

export interface ArenaRow {
  preset: ArenaPreset
  account: { id: number; name: string; starting_balance: number; leverage_max: number; risk_pct: number; created_at: string }
  watch: ArenaWatch
  stats: ArenaStats
  open_position: ArenaOpenPosition | null
  n_open_positions: number
  last_action: ArenaLastAction | null
  backtest: ArenaBacktest | null
  drift: ArenaDrift
}

export interface ArenaReport {
  generated_at: string
  review_min_trades: number
  method: { confidence: number; min_trades_rate: number; min_expected_entries: number; min_sharpe_days: number; snapshots: string }
  rows: ArenaRow[]
}

export interface ArenaCurveSeries {
  preset_id: number
  name: string
  coin: string
  family: string
  base: string
  account_id: number
  starting_balance: number
  points: { t: string; equity: number }[]
}

export interface ArenaCurves {
  generated_at: string
  series: ArenaCurveSeries[]
}
