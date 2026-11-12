import { describe, it, expect } from 'vitest'
import { holdoutPeriodError, proposedHoldoutStart } from './planning'
import { COST_LIMITS, DEFAULT_COSTS, isLiveTemplate, matchesParamQuery, templateShort, thresholdText, validateCosts } from './form'
import { initialForm, periodRange, switchTemplate, tfDefaultsPatch } from '@/components/lab/builder/form-state'
import rosyadeJson from '@/lib/mocks/lab-template.json'
import familiesJson from '@/lib/mocks/lab-templates-families.json'
import type { LabTemplate } from '@/lib/api/types/lab'
import type { LabRunDefaults } from '@/lib/api/types/lab-insights'

const ROSYADE = rosyadeJson as unknown as LabTemplate
const [DONCHIAN] = familiesJson as unknown as LabTemplate[]

describe('holdout lock before submit (mirror of honesty.resolve_holdout)', () => {
  const lock = '2025-07-15T00:00:00Z'
  it('no lock or a fine period -> no error', () => {
    expect(holdoutPeriodError(null, '2020-01-01', '')).toBeNull()
    expect(holdoutPeriodError(lock, '2020-01-01', '')).toBeNull()
  })
  it('start inside the lock, end before it, or < 60 days of training data', () => {
    expect(holdoutPeriodError(lock, '2025-08-01', '')).toMatch(/di dalam data baru yang terkunci \(sejak 15 Jul 2025\)/)
    expect(holdoutPeriodError(lock, '2020-01-01', '2025-07-01')).toMatch(/harus lewat dari 15 Jul 2025/)
    expect(holdoutPeriodError(lock, '2025-06-01', '')).toMatch(/kurang dari 60 hari/)
  })
  it('proposes the 80 % point for a first validation', () => {
    expect(proposedHoldoutStart('2020-01-01', '2025-01-01')).toBe('2024-01-01')
    expect(proposedHoldoutStart('2025-01-01', '2024-01-01')).toBeNull()
  })
})

describe('template-aware copy and backend cost limits', () => {
  it('"live" only for the Rosyade family', () => {
    expect(isLiveTemplate('rosyade_family')).toBe(true)
    expect(isLiveTemplate('donchian_breakout')).toBe(false)
    expect(templateShort('donchian_breakout')).toBe('Donchian')
    expect(templateShort('new_thing', 'New thing')).toBe('New thing')
  })
  it('fee <= 1 %, slippage <= 2 % (src/api/lab_models.py)', () => {
    expect(COST_LIMITS).toEqual({ commission_pct: 1, slippage_pct: 2 })
    expect(validateCosts({ ...DEFAULT_COSTS, commission_pct: '1.5' }).commission_pct).toBe('Maksimal 1%')
    expect(validateCosts({ ...DEFAULT_COSTS, slippage_pct: '1.5' }).slippage_pct).toBeUndefined()
    expect(validateCosts({ ...DEFAULT_COSTS, slippage_pct: '2.5' }).slippage_pct).toBe('Maksimal 2%')
  })
  it('thresholds read as words', () => {
    expect(thresholdText('>= 1.2')).toBe('minimal 1.2')
    expect(thresholdText('> -50.0')).toBe('di atas −50')
    expect(thresholdText('<= 3')).toBe('maksimal 3')
  })
  it('Lanjutan search matches Indonesian label, backend label, key and group', () => {
    const spec = ROSYADE.params.find((p) => p.key === 'cooldown_bars')!
    expect(matchesParamQuery(spec, 'jeda')).toBe(true)
    expect(matchesParamQuery(spec, 'cooldown')).toBe(true)
    expect(matchesParamQuery(spec, 'risiko')).toBe(true)
    expect(matchesParamQuery(spec, 'ema')).toBe(false)
  })
})

describe('form state', () => {
  const defaults = {
    timeframes: { '15m': { start: '2024-11-12', n_trials: 10, reason: '15m: 2 tahun data.' }, '4h': { start: '2020-01-01', n_trials: 30, reason: null } },
  } as unknown as LabRunDefaults
  const symbols = [{ symbol: 'BTCUSDT', has_data: true, timeframes: ['4h'] }, { symbol: 'ETHUSDT', has_data: true, timeframes: ['4h'] }]

  it('starts on ETH 4h with period "Otomatis" = the timeframe default', () => {
    const f = initialForm([ROSYADE], symbols, null, 'params', null, defaults)
    expect([f.symbol, f.timeframe, f.period, f.start, f.end]).toEqual(['ETHUSDT', '4h', 'auto', '2020-01-01', ''])
    expect(f.searchTouched).toBe(false)
  })
  it('"Otomatis" follows the timeframe; a picked period does not', () => {
    const f = initialForm([ROSYADE], symbols, null, 'params', null, defaults)
    expect(tfDefaultsPatch(f, '15m', defaults)).toMatchObject({ start: '2024-11-12', end: '' })
    const picked = { ...f, period: '1y' as const, ...periodRange('1y', '4h', f, defaults) }
    expect(tfDefaultsPatch(picked, '15m', defaults).start).toBeUndefined()
  })
  it('switching strategy resets params, search and preset', () => {
    const f = { ...initialForm([ROSYADE, DONCHIAN], symbols, null, 'params', null, defaults), presetId: '3', searchTouched: true }
    const g = switchTemplate(f, DONCHIAN, defaults)
    expect(g.templateId).toBe('donchian_breakout')
    expect(g.presetId).toBeNull()
    expect(g.searchTouched).toBe(false)
    expect(g.params.dc_atr_mult).toBe('4')
  })
})
