/**
 * Signal Ledger ("Catatan Sinyal") — mirrors src/api/ledger_routes.py.
 * Read-only: recording and scoring happen in the Lab worker.
 */
import type { LabId } from './lab'

export type LedgerSource = 'screener' | 'screener_rekon' | 'lab_watch' | 'universal' | 'webhook'
export type LedgerHorizon = '4h' | '1d' | '3d' | '7d'
export type LedgerSample = 'none' | 'too_few' | 'small' | 'ok'
export type LedgerVerdict = 'insufficient' | 'positive' | 'negative' | 'inconclusive'
export type LedgerDirection = 1 | -1

export interface LedgerHorizonStats {
  n: number
  hit_rate: number | null
  hit_ci: [number, number] | null
  mean_pct: number | null
  mean_ci: [number, number] | null
  median_pct: number | null
  mean_rel_btc_pct: number | null
  rel_btc_ci: [number, number] | null
  hit_rel_btc: number | null
  mean_mfe_pct: number | null
  mean_mae_pct: number | null
  days: number
  coins: number
  sample: LedgerSample
  verdict: LedgerVerdict
  verdict_rel_btc: LedgerVerdict
}

export interface LedgerGroup {
  source: LedgerSource
  signal_type: string
  direction: LedgerDirection | null
  n_signals: number
  n_pending: number
  n_no_data: number
  horizons: Record<LedgerHorizon, LedgerHorizonStats>
}

export interface LedgerFilters {
  source?: LedgerSource | ''
  symbol?: string
  signal_type?: string
  since?: string
  until?: string
}

export interface LedgerSummary {
  groups: LedgerGroup[]
  horizons: LedgerHorizon[]
}

export interface LedgerOutcome {
  exit_ts: string | null
  exit_price: number | null
  ret_pct: number | null
  dir_ret_pct: number | null
  btc_ret_pct: number | null
  rel_btc_pct: number | null
  mfe_pct: number | null
  mae_pct: number | null
  hit: 0 | 1 | null
}

export interface LedgerSignal {
  id: LabId
  source: LedgerSource
  signal_type: string
  symbol: string
  direction: LedgerDirection
  ts: string
  ref: string | null
  price: number | null
  entry_ts: string | null
  entry_price: number | null
  status: 'pending' | 'done' | 'no_data'
  meta: Record<string, unknown>
  outcomes: Partial<Record<LedgerHorizon, LedgerOutcome>>
}

export interface LedgerSignalsPage {
  items: LedgerSignal[]
  total: number
  limit: number
  offset: number
}

export interface LedgerTypeCount {
  source: LedgerSource
  signal_type: string
  n: number
  pending: number
  first_ts: string | null
  last_ts: string | null
}

export interface LedgerBackfill {
  status: 'queued' | 'running' | 'done' | 'error'
  days?: number
  from?: string
  to?: string
  started?: string
  finished?: string
  coins?: number
  hours?: number
  signals?: number
  error?: string
}

export interface LedgerMeta {
  horizons: LedgerHorizon[]
  sources: LedgerSource[]
  types: LedgerTypeCount[]
  symbols: string[]
  live_since: string | null
  last_live_snapshot: string | null
  last_cycle: {
    bar: string | null
    started: string | null
    finished: string | null
    screener: Record<string, unknown> | null
  } | null
  backfill: LedgerBackfill | null
  backfill_job: { id: LabId; status: string; progress: { stage?: string; done?: number; total?: number } | null; error: string | null } | null
  thresholds: { min_n_any: number; min_n_ok: number }
}
