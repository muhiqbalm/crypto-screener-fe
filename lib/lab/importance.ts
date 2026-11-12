/**
 * Parameter importance -> which params the "Uji strategi" form shows in step 2 and which go to
 * "Lanjutan". Pure (no React) so it is unit-tested directly.
 *
 * Rules (spec 05 §5, audit §3.9):
 * - Step 2 shows "penting & stabil" params first, then "penting tapi tidak stabil" (with a
 *   warning), at most MAX_STEP_PARAMS rows. "tidak berpengaruh" and unmeasured params go to Lanjutan.
 * - Without measurements (source "template" or an older backend) step 2 shows the template's
 *   tunable params in the backend's fallback order, at most MAX_STEP_PARAMS.
 * - Importance is advice only: nothing here changes a parameter value.
 */
import type { LabParamSpec, LabParamValue, LabTemplate } from '@/lib/api/types/lab'
import type { LabImportance, LabImportanceParam, LabStabilityLabel } from '@/lib/api/types/lab-uji'
import type { ParamFormValues } from './form'

export const MAX_STEP_PARAMS = 5
export const LABEL_STABLE: LabStabilityLabel = 'penting & stabil'
export const LABEL_UNSTABLE: LabStabilityLabel = 'penting tapi tidak stabil'
export const LABEL_NONE: LabStabilityLabel = 'tidak berpengaruh'

/** Rosyade params listed first when nothing is measured (mirror of backend FALLBACK_ORDER). */
const FALLBACK_ORDER: Record<string, string[]> = {
  rosyade_family: ['long_sl_pct', 'short_sl_pct', 'atr_mult_medium_long', 'atr_mult_medium_short', 'cooldown_bars'],
}

export interface StepParam {
  /** Lab key, or a composite research key ("sides" = enable_long + enable_short). */
  key: string
  specs: LabParamSpec[]
  label: LabStabilityLabel | null
  /** 0..1 against the strongest row shown (influence bar); null when unmeasured. */
  relative: number | null
  importance: LabImportanceParam | null
  /** All of its Lab keys can be searched by "Cari setting terbaik". */
  tunable: boolean
}

/**
 * Same shape as the endpoint, built from the template alone (older backend or request error):
 * the tunable params in fallback order, nothing measured.
 */
export function localImportance(template: LabTemplate, timeframe: string): LabImportance {
  const tun = template.params.filter((p) => p.tunable === true)
  const order = FALLBACK_ORDER[template.id] ?? []
  const pos = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length)
  const sorted = tun.map((p, i) => ({ p, i })).sort((a, b) => pos(a.p.key) - pos(b.p.key) || a.i - b.i)
  return {
    template_id: template.id,
    timeframe,
    source: 'template',
    basis: 'urutan bawaan template',
    basis_detail: 'Data kepentingan parameter belum tersedia, jadi urutannya bawaan template dan belum diukur.',
    date: null,
    n_runs: null,
    n_trials: null,
    n_coins: null,
    window: null,
    status: null,
    note: null,
    labels: {},
    params: sorted.map(({ p }, i) => ({
      key: p.key,
      lab_keys: [p.key],
      rank: i + 1,
      score: null,
      score_ci: null,
      label: null,
      tunable: true,
      group: p.group,
      coins_frac_important: null,
      folds_important: null,
      runs: null,
      runs_frac_important: null,
      current_default: p.default,
      recommended: null,
    })),
  }
}

function specsFor(template: LabTemplate, row: LabImportanceParam): LabParamSpec[] {
  return row.lab_keys
    .map((k) => template.params.find((p) => p.key === k))
    .filter((p): p is LabParamSpec => Boolean(p))
}

/** Rows for step 2 (see module doc). Rows whose keys are not in the template are skipped. */
export function stepParams(template: LabTemplate, importance: LabImportance, max = MAX_STEP_PARAMS): StepParam[] {
  const usable = importance.params
    .map((row) => ({ row, specs: specsFor(template, row) }))
    .filter((x) => x.specs.length > 0)
  let picked: typeof usable
  if (importance.source === 'template') {
    picked = usable.slice(0, max)
  } else {
    const byRank = [...usable].sort((a, b) => a.row.rank - b.row.rank)
    picked = [
      ...byRank.filter((x) => x.row.label === LABEL_STABLE),
      ...byRank.filter((x) => x.row.label === LABEL_UNSTABLE),
    ].slice(0, max)
  }
  const top = Math.max(0, ...picked.map((x) => x.row.score ?? 0))
  return picked.map(({ row, specs }) => ({
    key: row.key,
    specs,
    label: row.label,
    relative: row.score !== null && top > 0 ? Math.max(0.04, row.score / top) : null,
    importance: row,
    tunable: specs.every((s) => s.tunable === true),
  }))
}

/** Template keys controlled by step 2. */
export function stepKeys(step: StepParam[]): Set<string> {
  return new Set(step.flatMap((r) => r.specs.map((s) => s.key)))
}

/** Lab key -> its importance row (composites map each of their keys). */
export function importanceByKey(importance: LabImportance | null | undefined): Map<string, LabImportanceParam> {
  const out = new Map<string, LabImportanceParam>()
  for (const row of importance?.params ?? []) for (const k of row.lab_keys) out.set(k, row)
  return out
}

/** Keys "Cari setting terbaik" searches by default: the tunable params of step 2 (all tunables if none). */
export function defaultSearchKeys(template: LabTemplate, step: StepParam[]): string[] {
  const keys = step.filter((r) => r.tunable).flatMap((r) => r.specs.map((s) => s.key))
  return keys.length > 0 ? keys : template.params.filter((p) => p.tunable === true).map((p) => p.key)
}

/** "penting di 21 dari 24 koin · 3 dari 3 tahun uji" / "penting di 4 dari 5 run". */
export function stabilityDetail(row: LabImportanceParam, importance: LabImportance): string | null {
  const parts: string[] = []
  if (row.coins_frac_important !== null && importance.n_coins) {
    parts.push(`penting di ${Math.round(row.coins_frac_important * importance.n_coins)} dari ${importance.n_coins} koin`)
  }
  if (row.folds_important && row.folds_important.length > 0) {
    parts.push(`${row.folds_important.filter(Boolean).length} dari ${row.folds_important.length} tahun uji`)
  }
  if (row.runs_frac_important !== null && row.runs) {
    parts.push(`penting di ${Math.round(row.runs_frac_important * row.runs)} dari ${row.runs} run`)
  }
  return parts.length ? parts.join(' · ') : null
}

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
}

/** Research plateau as text: "4.7–9.9" or "long" / "long, short"; null when there is none. */
export function plateauText(row: LabImportanceParam | null | undefined, valueLabel?: (v: LabParamValue) => string): string | null {
  const rec = row?.recommended
  if (!rec) return null
  if (rec.range) return `${fmtNum(rec.range[0])}–${fmtNum(rec.range[1])}`
  if (rec.values && rec.values.length > 0) return rec.values.map((v) => (valueLabel ? valueLabel(v) : String(v))).join(', ')
  return null
}

/** Is the current numeric value inside the research plateau? null when there is no range. */
export function insidePlateau(row: LabImportanceParam | null | undefined, value: unknown): boolean | null {
  const r = row?.recommended?.range
  const n = Number(value)
  if (!r || !Number.isFinite(n)) return null
  return n >= r[0] && n <= r[1]
}

// ---------------------------------------------------------------------------
// "sides" composite: one control for enable_long + enable_short
// ---------------------------------------------------------------------------

export type Sides = 'both' | 'long' | 'short'

export function sidesOf(values: ParamFormValues): Sides {
  const long = values.enable_long !== false
  const short = values.enable_short !== false
  if (long && !short) return 'long'
  if (short && !long) return 'short'
  return 'both'
}

export function sidesPatch(s: Sides): ParamFormValues {
  return { enable_long: s !== 'short', enable_short: s !== 'long' }
}
