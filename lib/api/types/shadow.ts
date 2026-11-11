/**
 * Shadow execution ("Kualitas eksekusi") — mirrors src/api/shadow_routes.py / src/lab/shadow/report.py.
 * Read-only: the Lab worker measures live webhook signals; nothing here touches execution.
 * bps convention: slippage / drift / impact are COSTS (+ = paid more); saving / price diff are + = good.
 */
import type { LedgerSample } from './ledger'

export type ShadowOutcome = 'filled' | 'missed' | 'postonly'
export type ShadowStatus = 'pending' | 'partial' | 'done' | 'no_data' | 'error'

export interface ShadowResult {
  k: number
  ttl_min: number
  limit_px: number | null
  outcome: ShadowOutcome
  fill_ts: string | null
  time_to_fill_s: number | null
  price_diff_bps: number | null
  saving_bps: number | null
  end_px: number | null
  runaway_end_bps: number | null
  runaway_max_bps: number | null
  ref_px: number | null
  ref_basis: 'fill' | 'proxy'
  data_basis: 'aggtrades' | 'klines_1m'
}

export interface ShadowSignal {
  id: number
  symbol: string
  action: 'open' | 'close'
  side: 'long' | 'short'
  trade_dir: 1 | -1
  tf: string
  bar_close_ts: string
  arrival_ts: string
  arrival_basis: string | null
  off_close: number
  n_rows: number | null
  n_users: number | null
  statuses: string[]
  logs_final: boolean
  fill_price: number | null
  fill_ts: string | null
  bar_close_px: number | null
  atr: number | null
  p0: number | null
  p0_basis: string | null
  slippage_bps: number | null
  drift_bps: number | null
  impact_bps: number | null
  latency_s: number | null
  exec_latency_s: number | null
  status: ShadowStatus
  error: string | null
  computed_at: string | null
  results: ShadowResult[]
}

export interface ShadowCell {
  k: number
  ttl_min: number
  n: number
  filled: number
  missed: number
  postonly: number
  fill_rate: number | null
  fill_ci: [number | null, number | null] | null
  mean_saving_bps: number | null
  median_saving_bps: number | null
  mean_saving_filled_bps: number | null
  mean_saving_missed_bps: number | null
  median_time_to_fill_s: number | null
  mean_runaway_missed_bps: number | null
  proxy_ref: number
  klines_only: number
  sample: LedgerSample
}

export interface ShadowActual {
  n_signals: number
  n_counted: number
  n_off_close: number
  n_with_fill: number
  n_open: number
  n_close: number
  mean_slippage_bps: number | null
  median_slippage_bps: number | null
  mean_impact_bps: number | null
  mean_drift_bps: number | null
  mean_latency_s: number | null
  median_latency_s: number | null
  latency_upper_bound: boolean
  sample: LedgerSample
}

export interface ShadowReport {
  settings: { ks: number[]; ttls_min: number[]; taker_bps: number; maker_bps: number; fee_diff_bps: number; tf: string; enabled: boolean }
  thresholds: { min_n_any: number; min_n_ok: number }
  actual: ShadowActual
  grid: ShadowCell[]
  signals: ShadowSignal[]
  last_cycle: { started?: string; finished?: string; trade_log_rows?: number; evaluated?: Record<string, number> } | null
}
