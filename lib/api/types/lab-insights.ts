/**
 * Strategy Lab planning + insight types: run defaults per timeframe, runtime
 * estimate, queue/ETA, leaderboard and the preset library. Mirrors the
 * additive `/api/v1/lab` endpoints added with feat/lab-compare.
 */
import type { LabCosts, LabId, LabParamValue, LabRunMode, LabScanMode, LabVerdict } from './lab'

export interface LabTfDefault {
  start: string
  n_trials: number
  reason: string | null
}

export interface LabRunDefaults {
  timeframes: Record<string, LabTfDefault>
  timeouts: Record<LabRunMode, number>
  trial_options: number[]
  max_trials: number
  slots: number
  scan_slots: number
  long_job_s: number
  timeout_danger_fraction: number
}

export interface LabEstimateRequest {
  template_id?: string
  mode: LabRunMode | LabScanMode
  symbols: string[]
  timeframes: string[]
  start?: string
  end?: string
  starts?: Record<string, string>
  n_trials?: number
  scan?: boolean
}

export interface LabEstimateCell {
  symbol: string
  timeframe: string
  seconds: number
  bars: number | null
  cached: boolean
}

export interface LabEstimate {
  mode: string
  n_trials: number | null
  cells: LabEstimateCell[]
  by_timeframe: Record<string, { seconds_each: number; total_s: number }>
  total_s: number
  longest_s: number
  wall_s: number
  parallel: number
  timeout_s: number
  exceeds_timeout: string[]
  near_timeout: boolean
  long: boolean
  queue: { ahead_jobs: number; wait_s: number; slots: number; scan_slots: number }
  eta_done_s: number
  calibrated: boolean
}

export interface LabQueueJob {
  job_id: LabId
  kind: string
  run_id: LabId | null
  scan_id: LabId | null
  symbol: string | null
  timeframe: string | null
  mode: LabRunMode | null
  status: 'queued' | 'running'
  est_s: number
  elapsed_s: number | null
  remaining_s: number | null
  position: number | null
  eta_start_s: number | null
  eta_done_s: number | null
}

export interface LabQueue {
  slots: number
  scan_slots: number
  jobs: LabQueueJob[]
  backlog_s: number
  queued: number
  running: number
}

/** Additive queue fields on GET /jobs/{id} while queued/running. */
export interface LabJobEta {
  timeout_s?: number | null
  queue_position?: number | null
  est_s?: number | null
  eta_start_s?: number | null
  eta_done_s?: number | null
  elapsed_s?: number | null
}

export interface LabScanQueue {
  queued: number
  running: number
  queue_position: number | null
  eta_s: number | null
}

export interface LabPresetRef {
  id: LabId
  name: string
}

export type LabSnoopLevel = 'low' | 'medium' | 'high'

export interface LabBoardMetrics {
  net_return_pct: number | null
  profit_factor: number | null
  max_dd_pct: number | null
  sharpe: number | null
  trades: number | null
  win_rate_pct: number | null
}

export interface LabBoardRow {
  run_id: LabId
  scan_id: LabId | null
  template_id: string
  symbol: string
  timeframe: string
  mode: 'validate' | 'optimize'
  verdict: LabVerdict
  created_at: string
  start: string | null
  end: string | null
  holdout_start: string | null
  holdout_touches: number | null
  n_trials: number | null
  trials_done: number | null
  holdout: LabBoardMetrics & {
    stress_net_return_pct: number | null
    cost_drag_pct: number | null
    trades_per_month: number | null
  }
  in_sample: LabBoardMetrics
  failed_checks: string[]
  attempts: { runs: number; timeframes: number; trials: number; runs_this_tf: number; holdout_touches: number }
  snooping: LabSnoopLevel
  rank: number | null
  preset?: LabPresetRef | null
  saved_as?: string[]
}

export type LabBoardSort = 'oos_pf' | 'oos_sharpe' | 'oos_net'

export interface LabBoardFilters {
  template_id?: string
  symbol?: string
  timeframe?: string
  verdict?: 'PASS' | 'FAIL'
  mode?: 'validate' | 'optimize'
  sort?: LabBoardSort
  limit?: number
}

export interface LabLeaderboard {
  sort: LabBoardSort
  summary: { runs: number; pass: number; fail: number; trials: number; combinations: number }
  rows: LabBoardRow[]
  thresholds: Record<'medium' | 'high', { runs: number; timeframes: number; trials: number }>
}

export interface LabPresetHoldout {
  net_return_pct: number | null
  profit_factor: number | null
  max_dd_pct: number | null
  sharpe: number | null
  trades: number | null
  win_rate_pct: number | null
  stress_net_return_pct: number | null
  cost_drag_pct: number | null
  start: string | null
  end: string | null
}

export interface LabPreset {
  id: LabId
  name: string
  label: string
  template_id: string
  symbol: string
  timeframe: string
  params: Record<string, LabParamValue>
  costs: LabCosts
  notes: string | null
  readonly: boolean
  live_reference: boolean
  source_run_id: LabId | null
  source_mode: LabRunMode | null
  verdict: LabVerdict
  holdout: LabPresetHoldout | null
  snooping: { runs: number; timeframes: number; trials: number; holdout_touches: number } | null
  created_at: string
  usage: { runs: number; watches: number }
}

export interface LabPresetBestCell {
  id: LabId
  name: string
  verdict: LabVerdict
  live_reference: boolean
  params: Record<string, LabParamValue>
  holdout: LabPresetHoldout | null
}

export interface LabPresetWatchResponse {
  watch_id: LabId
  preset_id: LabId
  autopaper: { account_id: LabId; enabled: boolean } | null
}
