/**
 * "Uji strategi" form state: initial values (template defaults, ?from= run, ?preset=), the
 * period ("Otomatis" = the backend's per-timeframe default) and preset prefill. Pure, no React.
 */
import { tfDefault } from '@/lib/lab/planning'
import {
  DEFAULT_COSTS,
  TRIAL_OPTIONS,
  costsToForm,
  defaultOptimizeConfig,
  detectPreset,
  initialParamValues,
  presetRange,
  type CostFormValues,
  type DatePreset,
  type OptimizeConfig,
  type ParamFormValues,
  type TrialCount,
} from '@/lib/lab/form'
import type { LabParamValue, LabRunDetail, LabSymbol, LabTemplate } from '@/lib/api/types/lab'
import type { LabPreset, LabRunDefaults } from '@/lib/api/types/lab-insights'

/** 'auto' = start from the timeframe's default history (backend /run-defaults), up to the latest data. */
export type Period = 'auto' | DatePreset

export const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: 'auto', label: 'Otomatis' },
  { id: '1y', label: '1 tahun' },
  { id: '2y', label: '2 tahun' },
  { id: '3y', label: '3 tahun' },
  { id: 'since2020', label: 'Sejak 2020' },
  { id: 'custom', label: 'Pilih tanggal' },
]

export interface FormState {
  templateId: string
  symbol: string
  timeframe: string
  period: Period
  start: string
  end: string
  params: ParamFormValues
  costs: CostFormValues
  optimize: OptimizeConfig
  /** Preset the form was filled from (sent as provenance; backend links only unchanged params). */
  presetId: string | null
  /** User picked a trial count: stop applying per-timeframe defaults. */
  trialsTouched: boolean
  /** User edited the search set in Lanjutan; otherwise "Cari setting terbaik" searches the step-2 params. */
  searchTouched: boolean
}

export type PrefillUse = 'params' | 'best' | 'trial'

export function pickTimeframe(t: LabTemplate, preferred?: string): string {
  if (preferred && t.timeframes.includes(preferred)) return preferred
  if (t.timeframes.includes('4h')) return '4h'
  return t.timeframes[0] ?? ''
}

export function prefillOverrides(
  run: LabRunDetail | null,
  use: PrefillUse,
  rank: number | null,
): Record<string, LabParamValue> | null {
  if (!run) return null
  if (use === 'best' && run.best_params) return run.best_params
  if (use === 'trial' && rank !== null) {
    const t = run.top_trials?.find((x) => x.rank === rank)
    if (t) return { ...run.params, ...t.params }
  }
  return run.params
}

/** start/end for a period choice; 'custom' keeps the current dates. */
export function periodRange(period: Period, tf: string, current: { start: string; end: string }, defaults?: LabRunDefaults | null): { start: string; end: string } {
  if (period === 'auto') return { start: tfDefault(tf, defaults).start, end: '' }
  if (period === 'custom') return current
  return presetRange(period) ?? current
}

/** Period dates + trial count for a timeframe (only what the user has not chosen). */
export function tfDefaultsPatch(f: Pick<FormState, 'period' | 'trialsTouched' | 'optimize' | 'start' | 'end'>, tf: string, defaults?: LabRunDefaults | null): Partial<FormState> {
  const d = tfDefault(tf, defaults)
  const patch: Partial<FormState> = {}
  if (f.period === 'auto') {
    patch.start = d.start
    patch.end = ''
  }
  if (!f.trialsTouched && (TRIAL_OPTIONS as readonly number[]).includes(d.nTrials)) {
    patch.optimize = { ...f.optimize, nTrials: d.nTrials as TrialCount }
  }
  return patch
}

export function fromPreset(f: FormState, templates: LabTemplate[], p: LabPreset): FormState {
  const t = templates.find((x) => x.id === p.template_id) ?? templates[0]
  return {
    ...f,
    templateId: t.id,
    symbol: p.symbol,
    timeframe: pickTimeframe(t, p.timeframe),
    params: initialParamValues(t, p.params),
    costs: costsToForm(p.costs),
    presetId: String(p.id),
  }
}

/** A run's own period: 'auto' when it equals the timeframe default, else the matching preset. */
function periodOf(start: string, end: string, tf: string, defaults?: LabRunDefaults | null): Period {
  if (!end && start === tfDefault(tf, defaults).start) return 'auto'
  return detectPreset(start, end)
}

export function initialForm(
  templates: LabTemplate[],
  symbols: LabSymbol[],
  prefill: LabRunDetail | null,
  use: PrefillUse,
  rank: number | null,
  defaults?: LabRunDefaults | null,
  preset?: LabPreset | null,
): FormState {
  const template = (prefill && templates.find((t) => t.id === prefill.template_id)) || templates[0]
  const names = symbols.map((s) => s.symbol)
  const symbol =
    prefill && names.includes(prefill.symbol) ? prefill.symbol : names.includes('ETHUSDT') ? 'ETHUSDT' : (names[0] ?? '')
  const timeframe = pickTimeframe(template, prefill?.timeframe)
  const base: FormState = {
    templateId: template.id,
    symbol,
    timeframe,
    period: prefill ? periodOf(prefill.start ?? '', prefill.end ?? '', timeframe, defaults) : 'auto',
    start: prefill?.start ?? '',
    end: prefill?.end ?? '',
    params: initialParamValues(template, prefillOverrides(prefill, use, rank)),
    costs: prefill ? costsToForm(prefill.costs) : { ...DEFAULT_COSTS },
    optimize: defaultOptimizeConfig(template),
    presetId: prefill?.preset && use === 'params' ? String(prefill.preset.id) : null,
    trialsTouched: false,
    searchTouched: false,
  }
  const f = preset && !prefill ? fromPreset(base, templates, preset) : base
  return { ...f, ...tfDefaultsPatch(f, f.timeframe, defaults) }
}

/** Switching strategy resets params, search and preset (they belong to one template). */
export function switchTemplate(f: FormState, t: LabTemplate, defaults?: LabRunDefaults | null): FormState {
  const next: FormState = {
    ...f,
    templateId: t.id,
    params: initialParamValues(t),
    timeframe: pickTimeframe(t, f.timeframe),
    optimize: { ...defaultOptimizeConfig(t), nTrials: f.optimize.nTrials },
    presetId: null,
    searchTouched: false,
  }
  return { ...next, ...tfDefaultsPatch(next, next.timeframe, defaults) }
}
