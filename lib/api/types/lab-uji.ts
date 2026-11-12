/**
 * Types for the additive Lab endpoints of feat/ux-lab-uji (backend src/lab/importance.py and
 * src/api/lab_routes.py):
 *   GET /api/v1/lab/templates/{id}/importance?timeframe=4h
 *   GET /api/v1/lab/holdout-lock?template_id=&symbol=&timeframe=
 * plus the extra fields GET /api/v1/lab/runs already returns.
 */
import type { LabId, LabParamValue, LabRunSummary } from './lab'

/** research = riset file, runs = sensitivity of >= 5 finished runs, template = tunable order (unmeasured). */
export type LabImportanceSource = 'research' | 'runs' | 'template'

export type LabStabilityLabel = 'penting & stabil' | 'penting tapi tidak stabil' | 'tidak berpengaruh'

export interface LabImportanceRecommended {
  /** Plateau of the research's marginal curve (numeric params). */
  range: [number, number] | null
  /** Plateau values (categorical params, e.g. sides ["long"]). */
  values: LabParamValue[] | null
  default: LabParamValue | null
  current_inside: boolean | null
}

export interface LabImportanceParam {
  /** Research name; equals the Lab key unless it is a composite (sides, notional_mult). */
  key: string
  /** Lab param keys this row controls (sides -> enable_long + enable_short). */
  lab_keys: string[]
  rank: number
  /** Share of the result's variation (research) or of the sensitivity swing (runs); null = unmeasured. */
  score: number | null
  score_ci: [number, number] | null
  label: LabStabilityLabel | null
  /** Every lab key can be searched by "Cari setting terbaik". */
  tunable: boolean
  group: string | null
  coins_frac_important: number | null
  folds_important: boolean[] | null
  runs: number | null
  runs_frac_important: number | null
  current_default: LabParamValue | null
  recommended: LabImportanceRecommended | null
}

export interface LabImportance {
  template_id: string
  timeframe: string
  source: LabImportanceSource
  /** Short basis, e.g. "riset 12 Nov 2026", "dari 14 run", "urutan bawaan template". */
  basis: string
  basis_detail: string
  date: string | null
  n_runs: number | null
  n_trials: number | null
  n_coins: number | null
  window: { start: string; end: string } | null
  status: string | null
  /** Caveat to show with the data (e.g. research window overlaps the Lab holdout). */
  note: string | null
  labels: Partial<Record<LabStabilityLabel, number>>
  params: LabImportanceParam[]
}

export interface LabHoldoutLock {
  template_id: string
  symbol: string
  timeframe: string
  locked: boolean
  holdout_start: string | null
  touches: number
  created_at: string | null
  last_touch_at: string | null
  holdout_fraction: number
}

/** GET /lab/runs items also carry the job and scan they belong to. */
export interface LabRunListItem extends LabRunSummary {
  job_id?: LabId | null
  scan_id?: LabId | null
}
