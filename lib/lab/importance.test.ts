import { describe, it, expect } from 'vitest'
import rosyadeJson from '@/lib/mocks/lab-template.json'
import familiesJson from '@/lib/mocks/lab-templates-families.json'
import importanceJson from '@/lib/mocks/lab-importance.json'
import type { LabTemplate } from '@/lib/api/types/lab'
import type { LabImportance } from '@/lib/api/types/lab-uji'
import {
  LABEL_STABLE,
  LABEL_UNSTABLE,
  MAX_STEP_PARAMS,
  defaultSearchKeys,
  importanceByKey,
  insidePlateau,
  localImportance,
  plateauText,
  sidesOf,
  sidesPatch,
  stabilityDetail,
  stepKeys,
  stepParams,
} from './importance'

// Real shapes: the template schemas and importance responses are generated from the backend
// (src/lab/templates public_schema, src/lab/importance.py on the 12 Nov research snapshot).
const ROSYADE = rosyadeJson as unknown as LabTemplate
const [DONCHIAN, MEANREV] = familiesJson as unknown as LabTemplate[]
const IMP = importanceJson as unknown as Record<string, LabImportance>

describe('step 2 from research importance', () => {
  it('Rosyade 4H: the two stable params first, then unstable ones with a warning, at most 5', () => {
    const step = stepParams(ROSYADE, IMP['rosyade_family|4h'])
    expect(step).toHaveLength(MAX_STEP_PARAMS)
    expect(step.slice(0, 2).map((r) => r.key).sort()).toEqual(['atr_mult_weak_long', 'long_sl_pct'])
    expect(step.slice(0, 2).every((r) => r.label === LABEL_STABLE)).toBe(true)
    expect(step.slice(2).every((r) => r.label === LABEL_UNSTABLE)).toBe(true)
    // stable rows keep their rank order; bars are relative to the strongest shown row
    expect(Math.max(...step.map((r) => r.relative ?? 0))).toBe(1)
  })

  it('Donchian 4H: trailing stop first, composite "sides" maps to two Lab switches', () => {
    const step = stepParams(DONCHIAN, IMP['donchian_breakout|4h'])
    expect(step.map((r) => r.key)).toEqual(['dc_atr_mult', 'sides', 'dc_entry_len'])
    const sides = step[1]
    expect(sides.specs.map((s) => s.key)).toEqual(['enable_long', 'enable_short'])
    expect(sides.tunable).toBe(false)
    expect(step[0].tunable).toBe(true)
  })

  it('Mean reversion 4H shows its three stable params', () => {
    expect(stepParams(MEANREV, IMP['mean_reversion_range|4h']).map((r) => r.key)).toEqual(['mr_mult', 'mr_regime', 'mr_len'])
  })

  it('nothing important -> empty step 2 (all in Lanjutan)', () => {
    const imp: LabImportance = { ...IMP['donchian_breakout|4h'], params: IMP['donchian_breakout|4h'].params.map((p) => ({ ...p, label: 'tidak berpengaruh' })) }
    expect(stepParams(DONCHIAN, imp)).toEqual([])
  })

  it('skips rows whose Lab keys are not in the template', () => {
    const imp: LabImportance = {
      ...IMP['donchian_breakout|4h'],
      params: [{ ...IMP['donchian_breakout|4h'].params[0], key: 'ghost', lab_keys: ['ghost'] }],
    }
    expect(stepParams(DONCHIAN, imp)).toEqual([])
  })
})

describe('fallback without measurements', () => {
  it('backend "template" source and the local fallback agree: Rosyade fixed order, max 5', () => {
    const local = stepParams(ROSYADE, localImportance(ROSYADE, '1h')).map((r) => r.key)
    expect(local).toEqual(['long_sl_pct', 'short_sl_pct', 'atr_mult_medium_long', 'atr_mult_medium_short', 'cooldown_bars'])
    expect(stepParams(ROSYADE, IMP['rosyade_family|1h']).map((r) => r.key)).toEqual(local)
    expect(stepParams(ROSYADE, localImportance(ROSYADE, '1h')).every((r) => r.relative === null)).toBe(true)
  })

  it('Donchian (4) and Mean reversion (5) show all their main params', () => {
    expect(stepParams(DONCHIAN, localImportance(DONCHIAN, '1h'))).toHaveLength(4)
    expect(stepParams(MEANREV, localImportance(MEANREV, '1h'))).toHaveLength(5)
  })
})

describe('search defaults and helpers', () => {
  it('"Cari setting terbaik" searches the tunable params of step 2 only', () => {
    const step = stepParams(ROSYADE, IMP['rosyade_family|4h'])
    expect(defaultSearchKeys(ROSYADE, step)).toEqual(['long_sl_pct'])
    expect(stepKeys(step).has('atr_mult_weak_long')).toBe(true)
    // no tunable in step 2 -> all tunables (old behaviour)
    expect(defaultSearchKeys(ROSYADE, [])).toHaveLength(12)
  })

  it('maps composite rows to each Lab key', () => {
    const m = importanceByKey(IMP['donchian_breakout|1d'])
    expect(m.get('enable_long')?.key).toBe('sides')
    expect(m.get('enable_short')?.key).toBe('sides')
    expect(importanceByKey(null).size).toBe(0)
  })

  it('plateau text and inside check', () => {
    const row = IMP['donchian_breakout|4h'].params[0]
    expect(plateauText(row)).toBe('4.7–9.9')
    expect(insidePlateau(row, '4')).toBe(false)
    expect(insidePlateau(row, 7)).toBe(true)
    expect(insidePlateau(null, 7)).toBeNull()
    const sides = IMP['donchian_breakout|1d'].params.find((p) => p.key === 'sides')!
    expect(plateauText(sides, (v) => (v === 'long' ? 'Long saja' : String(v)))).toBe('Long saja')
  })

  it('stability detail cites coins and fold years', () => {
    const imp = IMP['donchian_breakout|4h']
    expect(stabilityDetail(imp.params[0], imp)).toBe('penting di 21 dari 24 koin · 3 dari 3 tahun uji')
  })

  it('sides control round-trips', () => {
    expect(sidesOf({ enable_long: true, enable_short: true })).toBe('both')
    expect(sidesOf({ enable_long: true, enable_short: false })).toBe('long')
    expect(sidesOf({ enable_long: false, enable_short: true })).toBe('short')
    expect(sidesPatch('long')).toEqual({ enable_long: true, enable_short: false })
    expect(sidesPatch('both')).toEqual({ enable_long: true, enable_short: true })
  })
})
