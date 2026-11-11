/**
 * Outlook Koin + market regime — mirrors src/api/outlook_routes.py and
 * src/lab/outlook/logic.py on the backend.
 */
import type { LabId, LabVerdict } from './lab'

export type OutlookSide = 'long' | 'short'
export type OutlookBias = 'LONG' | 'SHORT' | 'NETRAL'
export type Keyakinan = 'rendah' | 'sedang' | 'tinggi'
export type RegimeLabel = 'naik' | 'turun' | 'datar'
export type Sizing = 'notional' | 'risk'
export type EvidenceCode =
  | 'lolos_uji'
  | 'gagal_uji'
  | 'belum_diuji'
  | 'terbukti'
  | 'negatif'
  | 'belum_terbukti'
  | 'belum_cukup_data'
  | 'historis'
  | 'konteks'
  | 'tidak_tersedia'

export interface OutlookPreset {
  id: LabId
  name: string
  verdict: LabVerdict
  live_reference?: boolean
  holdout_start: string | null
  holdout_end: string | null
  contaminated: boolean | null
  failed_checks: string[]
  holdout_pf: number | null
  holdout_trades: number | null
  holdout_win_rate_pct: number | null
  holdout_max_dd_pct: number | null
}

export interface OutlookStrategy {
  template_id: string
  timeframe: string
  preset: OutlookPreset | null
  param_source: 'preset' | 'template_default'
  evidence: 'lolos_uji' | 'gagal_uji' | 'belum_diuji'
  side: OutlookSide | null
  last_bar: string
  last_bar_close: string
  entry_price?: number | null
  entry_time?: string | null
  entry_at?: string | null
  sl?: number | null
  tp?: number | null
  base_sl?: number | null
  tp1?: number | null
  tp2?: number | null
  fresh?: boolean
  bars_in_trade?: number
  open_pnl_pct?: number | null
  dist_sl_pct?: number | null
  dist_tp_pct?: number | null
  dist_sl_r?: number | null
  dist_tp_r?: number | null
  open_r?: number | null
  r_unit_pct?: number | null
  breakeven_locked?: boolean
  last_exit?: { time: string; side: OutlookSide; reason: string | null; pnl_pct: number | null } | null
  watch_check?: { watch_id: LabId; side: OutlookSide | null; agrees: boolean } | null
  error?: string | null
}

export interface OutlookFactor {
  key: 'strategi' | 'screener' | 'tren' | 'momentum' | 'funding' | 'oi' | 'regime' | 'berita'
  label: string
  direction: -1 | 0 | 1
  weight: number
  used_weight: number
  value: string
  detail: string
  evidence: EvidenceCode
  evidence_text: string
  source: string
  available: boolean
}

export interface OutlookBiasInfo {
  bias: OutlookBias
  keyakinan: Keyakinan | null
  condong: 'naik' | 'turun' | null
  support: number | null
  lean: number | null
  max_support: number | null
  reasons: string[]
}

export interface TradeStats {
  n: number
  win_rate_pct: number | null
  avg_win_pct: number | null
  avg_loss_pct: number | null
  mean_pct: number | null
  median_hold_hours: number | null
}

export interface RegimeBucket {
  n: number
  win_rate_pct: number | null
  mean_pct: number | null
  sum_pct: number | null
  enough: boolean
}

export type RegimePerf = Record<OutlookSide, Record<RegimeLabel, RegimeBucket>>

export interface OutlookBacktest extends TradeStats {
  basis: 'holdout' | 'full_in_sample'
  basis_text: string
  by_side: Record<OutlookSide, TradeStats>
  full: TradeStats
  by_regime: RegimePerf
  by_regime_basis: string
  first_trade: string | null
}

export interface ProjectionLeg {
  price: number
  move_pct: number
  gross: number
  fees: number
  net: number
  net_pct_of_capital: number | null
}

export interface OutlookProjection {
  capital: number
  leverage: number
  sizing: Sizing
  risk_pct: number | null
  cost_per_side_pct: number
  available: boolean
  reason?: string
  basis_price?: number
  basis_text?: string
  side?: OutlookSide
  notional?: number
  margin?: number
  qty?: number
  at_tp?: ProjectionLeg | null
  at_tp1?: ProjectionLeg | null
  at_sl?: ProjectionLeg | null
  rr?: number | null
  expected?: {
    basis: string
    basis_text: string
    subset: string
    n: number
    win_rate_pct: number | null
    avg_win_pct: number | null
    avg_loss_pct: number | null
    mean_pct: number
    median_hold_hours: number | null
    ev_usd: number
    avg_win_usd: number | null
    avg_loss_usd: number | null
    small_sample: boolean
    caveat: string
  } | null
  warnings?: string[]
  note?: string
}

export interface OutlookHeadline {
  title: string
  url: string | null
  published_at: string | null
  source: string
}

export interface OutlookRow {
  symbol: string
  coin: string
  computed_at: string
  last_bar: string
  last_bar_close: string
  price: number
  price_source: string
  strategy: OutlookStrategy
  backtest: OutlookBacktest
  factors: OutlookFactor[]
  bias: OutlookBiasInfo
  market: Record<string, unknown>
  explanation: { summary: string; paragraphs?: string[]; narrator: string; ai_summary?: string | null }
  projection: OutlookProjection
  age_hours: number | null
  stale: boolean
  error?: string | null
  unavailable?: boolean
}

export interface OutlookMethod {
  weights: Record<string, number>
  evidence_mult: Record<string, number>
  evidence_text: Record<EvidenceCode, string>
  text: string[]
}

export interface OutlookJob {
  id: LabId
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled'
  created_at: string
  started_at: string | null
  finished_at: string | null
  error: string | null
  progress: { stage?: string; done?: number; total?: number } | null
}

export interface RegimeBrief {
  label: RegimeLabel | null
  label_text: string
  as_of?: string
  days_in_label?: number
  dist_ema_slow_pct?: number | null
  slope_pct?: number | null
  available?: boolean
}

export interface OutlookMeta {
  computed_at: string
  runtime_s: number
  symbols: number
  ok: number
  errors: Record<string, string>
  last_bar: string | null
  fear_greed: { value: number; classification: string | null; as_of: string | null } | null
  news: { available: boolean; items: number; source: string }
  screener_bar: string | null
}

export interface OutlookInputs {
  capital: number
  leverage: number
  sizing: Sizing
  risk_pct: number
}

export interface OutlookResponse {
  meta: OutlookMeta | null
  refresh: OutlookJob | null
  now: string
  inputs: OutlookInputs
  regime: { btc: RegimeBrief | null; eth: RegimeBrief | null }
  method: OutlookMethod
  disclaimer: string
  rows: OutlookRow[]
}

export interface OutlookDetail extends OutlookRow {
  detail: {
    candles: [number, number, number, number, number][]
    recent_trades: {
      entry_time: string
      exit_time: string | null
      side: string
      entry_price: number
      exit_price: number | null
      pnl_pct: number | null
      exit_reason: string | null
    }[]
    headlines: OutlookHeadline[]
  }
  regime: { btc: RegimeCurrent | null; eth: RegimeCurrent | null; rule: string | null }
  method: OutlookMethod
  disclaimer: string
  inputs: OutlookInputs
}

export interface RegimeCurrent extends RegimeBrief {
  symbol: string
  close?: number
  ema_fast?: number
  ema_slow?: number
  inputs?: { close_above_ema_slow: boolean; ema_fast_above_slow: boolean; ema_fast_rising: boolean }
  history?: { t: string; label: RegimeLabel }[]
}

export interface RegimeResponse {
  available: boolean
  computed_at: string | null
  rule: string
  btc: RegimeCurrent | null
  eth: RegimeCurrent | null
  presets: {
    id: LabId
    name: string
    symbol: string
    verdict: LabVerdict
    n_trades?: number
    perf?: RegimePerf
    holdout_perf?: RegimePerf | null
  }[] | null
  note?: string
}
