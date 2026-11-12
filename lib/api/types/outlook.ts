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
  | 'teruji_replay'
  | 'belum_terbukti_replay'
  | 'terbalik_replay'
export type Fase = 'baru' | 'berjalan'
export type StrategyClass = 'lolos_uji' | 'belum_diuji' | 'gagal_uji'
export type CallStatus = 'none' | 'open' | 'tp' | 'sl' | 'batal' | 'expired' | 'invalid'
export type PeluangLabel = 'positif' | 'negatif' | 'belum_jelas' | 'belum_terukur' | 'tidak_ada_sinyal' | 'tidak_valid' | 'basi'

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
  /** v2: preset name, or "Rosyade default 4H" when no preset passed validation */
  name?: string
  primary?: boolean
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

export interface FactorLift {
  verdict: 'teruji' | 'belum_terbukti' | 'terbalik'
  searah_mean_r: number | null
  searah_n_pos: number | null
  berlawanan_mean_r: number | null
  berlawanan_n_pos: number | null
  diff_r: number | null
  se_diff_r: number | null
}

export interface OutlookFactor {
  key: 'strategi' | 'screener' | 'tren_1d' | 'momentum_1h' | 'funding' | 'oi' | 'regime' | 'berita' | 'tren' | 'momentum'
  label: string
  /** v2: utama = strategy position, mtf = 1D/1H/BTC context, konteks = live-only context */
  group?: 'utama' | 'mtf' | 'konteks'
  in_keyakinan?: boolean
  lift?: FactorLift | null
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

export interface CalibStats {
  n_cases: number
  n_pos: number
  p_tp: number | null
  p_sl: number | null
  p_batal: number | null
  p_expired: number | null
  mean_r: number | null
  lo95_r: number | null
  median_r: number | null
  ev_shrunk_r: number | null
  win_rate: number | null
  median_mfe_r: number | null
  median_bars: number | null
}

export interface OutlookBiasInfo {
  bias: OutlookBias
  keyakinan: Keyakinan | null
  condong: 'naik' | 'turun' | null
  support: number | null
  lean: number | null
  max_support: number | null
  reasons: string[]
  /** v2 */
  basis?: 'kalibrasi' | 'aturan' | null
  cls?: StrategyClass
  fase?: Fase
  align?: 'searah' | 'campuran' | 'berlawanan'
  conclusion?: string | null
  calib?: {
    key: string
    enough: boolean
    stats: CalibStats | null
    own_key: string
    own: CalibStats | null
    pool_key: string
    pooled: CalibStats | null
    computed_at: string | null
  } | null
}

export interface OutlookPlan {
  action: 'masuk' | 'menyusul' | 'tunggu' | 'jangan_masuk'
  side: OutlookSide | null
  text: string
  saran?: string
  freshness: { bar_close: string | null; age_hours: number | null; stale: boolean; fresh_signal: boolean }
  price?: number
  sl?: number | null
  tp?: number | null
  timeframe?: string
  horizon_bars?: number
  horizon_hours?: number
  valid_until?: string | null
  fase?: Fase
  geometry_ok?: boolean
  r_unit?: number
  r_unit_pct?: number
  rr?: number | null
  entry_zone?: [number, number]
  dont_chase?: number
  rr_at_dont_chase?: number | null
  target_typical?: number | null
  target_typical_r?: number | null
  invalidation?: string[]
  batal_kalau?: string
  warnings?: string[]
}

export interface OutlookStrategyRow {
  name: string
  template_id: string
  timeframe: string
  verdict: LabVerdict | null
  evidence?: 'lolos_uji' | 'gagal_uji' | 'belum_diuji'
  primary: boolean
  side?: OutlookSide | null
  entry_at?: string | null
  entry_price?: number | null
  sl?: number | null
  tp?: number | null
  fresh?: boolean
  last_bar?: string
  contaminated?: boolean | null
  error?: string
}

export interface AgreementCount {
  long: number
  short: number
  flat: number
  error: number
  n: number
}

export interface OutlookPeluang {
  eligible: boolean
  score: number | null
  label: PeluangLabel
  reason: string
  rank?: number
}

export interface OpenPosition {
  source: 'paper' | 'live'
  side: string
  entry_price: number | null
  entry_time: string | null
  account?: string | null
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
  /** v2 */
  at_typical?: ProjectionLeg | null
  rr_text?: string | null
  calibrated?: {
    key: string
    n_cases: number
    n_pos: number
    mean_r: number
    ev_shrunk_r: number | null
    lo95_r: number | null
    p_tp: number | null
    p_sl: number | null
    p_batal: number | null
    p_expired: number | null
    win_rate: number | null
    risk_usd: number
    ev_usd: number
    lo95_usd: number | null
    enough: boolean
    caveat: string
  } | null
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
  /** v2 (absent on rows computed before the v2 job ran) */
  schema_version?: number
  plan?: OutlookPlan
  strategies?: OutlookStrategyRow[]
  agreement?: { all: AgreementCount; lolos_uji: AgreementCount }
  mtf?: { states: Record<string, unknown>; dirs: Record<string, -1 | 0 | 1 | null> }
  changes?: string[]
  previous_call?: { bar: string; side: OutlookSide | null; keyakinan: Keyakinan | null; sl: number | null; tp: number | null; price: number | null; status: CallStatus } | null
  peluang?: OutlookPeluang
  positions?: OpenPosition[]
  coin_calibration?: { key: string; fase: CalibStats | null; side: CalibStats | null } | null
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

export interface TrackGroup {
  n_calls: number
  n_done: number
  n_open: number
  n_pos: number
  tp?: number
  sl?: number
  batal?: number
  expired?: number
  mean_r?: number
  win_rate?: number
}

export interface CalibrationBrief {
  computed_at: string
  version: number
  counts: { cases: number; done: number; positions: number; coins: number; first: string | null; last: string | null }
  split: string
  method: string[]
  excluded: { factor: string; reason: string }[]
  by_keyakinan: Record<string, CalibStats>
  oos_check: { split: string; train_cases: number; test_cases: number; v2: Record<string, CalibStats>; apriori: Record<string, CalibStats> }
  fase_split: Record<'sebelum' | 'sesudah' | 'semua', Record<string, CalibStats>>
  factor_lift: Record<string, { verdict: FactorLift['verdict']; diff_r: number | null; se_diff_r: number | null; searah: CalibStats; berlawanan: CalibStats }>
  ambiguous_share: number | null
  engine_commit: string | null
  runtime_s: number | null
}

export interface OutlookCounts {
  total: number
  arah: Record<'long' | 'short' | 'netral', number>
  keyakinan: Record<Keyakinan, number>
  posisi: Record<'ada' | 'tidak', number>
  peluang_positif: number
  sinyal_baru: number
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
  /** v2 */
  schema_version?: number
  calibrate?: OutlookJob | null
  counts?: OutlookCounts
  positions_available?: { paper: boolean; live: boolean }
  ranking?: string[]
  calibration?: CalibrationBrief | null
  track_record?: { since: string | null; first_call: string | null; groups: Record<string, TrackGroup> }
}

export interface OutlookCall {
  id: LabId
  symbol: string
  bar: string
  bar_close: string
  side: OutlookSide | null
  keyakinan: Keyakinan | null
  cls: StrategyClass | null
  fase: Fase | null
  strategy: string | null
  price: number | null
  sl: number | null
  tp: number | null
  rr: number | null
  ev_r: number | null
  status: CallStatus
  r_net: number | null
  mfe_r: number | null
  bars_to_resolve: number | null
  resolved_at: string | null
}

export interface OutlookTrackRecord {
  since: string | null
  first_call: string | null
  groups: Record<string, TrackGroup>
  recent: OutlookCall[]
  calibration: Pick<CalibrationBrief, 'computed_at' | 'counts' | 'by_keyakinan' | 'oos_check' | 'fase_split' | 'split'> | null
  statuses: Record<string, string>
  note: string
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
  /** v2 */
  calls?: OutlookCall[]
  coin_calibration_all?: Record<string, CalibStats> | null
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
