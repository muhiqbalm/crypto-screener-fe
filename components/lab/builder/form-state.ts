/**
 * Run builder form state: initial values (template defaults, ?from= run,
 * ?preset=), per-timeframe defaults and preset prefill. Pure, no React.
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

export interface FormState {
  templateId: string
  symbol: string
  timeframe: string
  preset: DatePreset
  start: string
  end: string
  params: ParamFormValues
  costs: CostFormValues
  optimize: OptimizeConfig
  /** Preset the form was filled from (sent as provenance; backend links only unchanged params). */
  presetId: string | null
  /** User picked a period / trial count: stop applying per-timeframe defaults. */
  periodTouched: boolean
  trialsTouched: boolean
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

/** Period + trial count for a timeframe unless the user already chose them. */
export function tfDefaultsPatch(f: Pick<FormState, 'periodTouched' | 'trialsTouched' | 'optimize'>, tf: string, defaults?: LabRunDefaults | null): Partial<FormState> {
  const d = tfDefault(tf, defaults)
  const patch: Partial<FormState> = {}
  if (!f.periodTouched) {
    patch.start = d.start
    patch.end = ''
    patch.preset = detectPreset(d.start, '')
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
  const range = prefill ? { start: prefill.start ?? '', end: prefill.end ?? '' } : presetRange('since2020')!
  const base: FormState = {
    templateId: template.id,
    symbol,
    timeframe: pickTimeframe(template, prefill?.timeframe),
    preset: prefill ? detectPreset(range.start, range.end) : 'since2020',
    start: range.start,
    end: range.end,
    params: initialParamValues(template, prefillOverrides(prefill, use, rank)),
    costs: prefill ? costsToForm(prefill.costs) : { ...DEFAULT_COSTS },
    optimize: defaultOptimizeConfig(template),
    presetId: prefill?.preset && use === 'params' ? String(prefill.preset.id) : null,
    periodTouched: Boolean(prefill),
    trialsTouched: false,
  }
  const f = preset && !prefill ? fromPreset(base, templates, preset) : base
  return { ...f, ...tfDefaultsPatch(f, f.timeframe, defaults) }
}
