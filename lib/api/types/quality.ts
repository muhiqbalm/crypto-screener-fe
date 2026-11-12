/**
 * Skor kualitas sinyal: mirrors src/lab/outlook/quality.py (backend).
 * One letter per Outlook call: A bukti kuat · B bukti cukup · C belum jelas · D tanpa keunggulan.
 */
import type { CallStatus, Fase, OutlookSide } from './outlook'

export type QualityGrade = 'A' | 'B' | 'C' | 'D'
/** What a stored call keeps: a letter, '-' for a call without a letter, null before grading existed. */
export type StoredGrade = QualityGrade | '-' | null

export interface QualityEvidence {
  key: string
  /** strategi_ini = this strategy's evidence class; semua_strategi = every out-of-sample strategy */
  scope: 'strategi_ini' | 'semua_strategi'
  label: string
  n_cases: number | null
  n_pos: number | null
  p_tp: number | null
  p_sl: number | null
  p_batal: number | null
  p_expired: number | null
  win_rate: number | null
  mean_r: number | null
  lo95_r: number | null
  hi95_r: number | null
  half_r: number | null
}

export interface QualityCheck {
  key: 'momentum_1h' | 'tren_1d' | 'regime' | 'screener' | 'oi' | 'funding' | string
  label: string
  value: string | null
  available: boolean
  /** +1 searah, −1 berlawanan, 0 netral (relative to the call's side) */
  agree: -1 | 0 | 1
  /** proven by the simulation lift ('teruji') or Catatan Sinyal ('terbukti') */
  proven: boolean
  evidence: string | null
  evidence_text: string | null
  source: string | null
  /** −1 when this factor lowered the grade */
  effect: -1 | 0
}

export interface QualityLive {
  key: string | null
  n_done: number
  n_pos: number
  mean_r: number | null
  lo95_r: number | null
  hi95_r: number | null
  win_rate: number | null
  enough: boolean
  need_pos: number
  negative: boolean
}

export interface QualityAdjustment {
  step: number
  kind: 'faktor' | 'live' | 'batas'
  text: string
}

export interface OutlookKualitas {
  grade: QualityGrade | null
  label: string
  rank: number
  base: QualityGrade | null
  base_reason: string
  summary: string
  why_none: string | null
  evidence: QualityEvidence | null
  outcome_text: string | null
  checks: QualityCheck[]
  live: QualityLive | null
  adjustments: QualityAdjustment[]
  rule_version: number
  basis: 'saat_panggilan' | 'dihitung_ulang'
}

/** kualitas_json of a stored call (compact). */
export interface StoredKualitasInfo {
  grade: QualityGrade | null
  base: QualityGrade | null
  basis?: 'saat_panggilan' | 'dihitung_ulang'
  why_none?: string | null
  against?: string[]
  partial?: string | null
}

export interface ScoreGroup {
  grade: QualityGrade
  label: string
  n_calls: number
  n_open: number
  n_done: number
  n_pos: number
  mean_r: number | null
  lo95_r: number | null
  hi95_r: number | null
  win_rate: number | null
  p_tp: number | null
  p_sl: number | null
  p_batal: number | null
  p_expired: number | null
  sum_r: number
  enough: boolean
  verdict: 'belum_cukup' | 'positif' | 'negatif' | 'belum_jelas'
}

export interface SimGroupStats {
  n_cases: number
  n_pos: number
  mean_r: number | null
  se_r?: number | null
  lo95_r: number | null
  hi95_r: number | null
  p_tp?: number | null
  p_sl?: number | null
  p_batal?: number | null
  p_expired?: number | null
  win_rate?: number | null
}

export interface RekamSkorSim {
  split: string | null
  computed_at: string | null
  groups: {
    key: string
    side: OutlookSide
    fase: Fase
    grade: QualityGrade
    before: { n_pos: number; mean_r: number | null; lo95_r: number | null }
    after: { n_cases: number; n_pos: number; mean_r: number | null; lo95_r: number | null; p_tp: number | null; p_sl: number | null; p_batal: number | null }
  }[]
  by_grade: Partial<Record<QualityGrade, SimGroupStats>>
  note: string
}

export interface RekamSkorCall {
  id: number | string
  symbol: string
  bar: string
  bar_close: string | null
  side: OutlookSide
  fase: Fase | null
  kualitas: StoredGrade
  status: CallStatus
  r_net: number | null
  price: number | null
  resolved_at: string | null
  basis: 'saat_panggilan' | 'dihitung_ulang' | null
}

export interface RekamSkorResponse {
  rule_version: number
  rule: string[]
  need_pos: number
  first_graded: string | null
  n_calls: number
  n_graded: number
  n_no_letter: number
  n_ungraded: number
  n_backfilled: number
  n_done: number
  n_pos_done: number
  enough_any: boolean
  by_grade: Record<QualityGrade, ScoreGroup>
  recent: RekamSkorCall[]
  simulasi: RekamSkorSim | null
  note: string
}
