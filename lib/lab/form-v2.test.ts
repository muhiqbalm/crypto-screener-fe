import { describe, it, expect } from 'vitest'
import templateJson from '@/lib/mocks/lab-template.json'
import type { LabCheck, LabTemplate } from '@/lib/api/types/lab'
import {
  DEFAULT_COSTS,
  buildRunRequest,
  changedKeys,
  checkReason,
  defaultOptimizeConfig,
  detectPreset,
  diffFromDefaults,
  estimateMinutes,
  groupLabel,
  initialParamValues,
  presetRange,
  relativeTime,
  splitParams,
  thresholdNumber,
  validateOptimize,
} from './form'

const T = templateJson as unknown as LabTemplate

describe('real rosyade_family schema', () => {
  it('splits 12 tunable main params from 99 advanced', () => {
    const { main, advanced } = splitParams(T)
    expect(T.params).toHaveLength(111)
    expect(main.map((p) => p.key)).toEqual([
      'swing_len', 'long_sl_pct', 'short_sl_pct', 'ema_exit_len', 'structure_pivot_len', 'atr_mult_medium_long',
      'atr_mult_medium_short', 'adx_strong_threshold', 'entry_vol_mult', 'ema_htf_len', 'chop_limit', 'cooldown_bars',
    ])
    expect(advanced.reduce((a, g) => a + g.params.length, 0)).toBe(99)
  })

  it('counts changed params vs live defaults', () => {
    const v = initialParamValues(T)
    expect(changedKeys(T, v)).toEqual([])
    expect(changedKeys(T, { ...v, swing_len: '3', enable_short: false })).toEqual(['enable_short', 'swing_len'])
  })

  it('diffs a full best_params set against defaults', () => {
    const best = { ...Object.fromEntries(T.params.map((p) => [p.key, p.default])), long_sl_pct: 9.5 }
    const d = diffFromDefaults(T, best)
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({ key: 'long_sl_pct', label: 'Stop loss long (%)', def: 13, value: 9.5 })
  })
})

describe('date presets', () => {
  const today = new Date('2026-11-10T00:00:00Z')
  it('maps presets to ranges and back', () => {
    expect(presetRange('1y', today)).toEqual({ start: '2025-11-10', end: '' })
    expect(presetRange('3y', today)).toEqual({ start: '2023-11-10', end: '' })
    expect(presetRange('since2020', today)).toEqual({ start: '2020-01-01', end: '' })
    expect(presetRange('custom', today)).toBeNull()
    expect(detectPreset('2023-11-10', '', today)).toBe('3y')
    expect(detectPreset('2021-05-01', '2022-01-01', today)).toBe('custom')
  })
})

describe('optimize payload', () => {
  const form = { template: T, symbol: 'SOLUSDT', timeframe: '4h', start: '2020-01-01', end: '', params: initialParamValues(T), costs: DEFAULT_COSTS }

  it('defaults to 30 trials searching all 12 main params over their schema ranges', () => {
    const cfg = defaultOptimizeConfig(T)
    const req = buildRunRequest(form, 'optimize', cfg)
    expect(req.n_trials).toBe(30)
    expect(req.search?.params).toHaveLength(12)
    expect(req.search?.ranges.long_sl_pct).toEqual([0.5, 30])
  })

  it('restricts search to checked params with custom ranges', () => {
    const cfg = defaultOptimizeConfig(T)
    for (const k of Object.keys(cfg.ranges)) cfg.ranges[k].enabled = false
    cfg.ranges.swing_len = { enabled: true, min: '2', max: '6' }
    cfg.nTrials = 10
    const req = buildRunRequest(form, 'optimize', cfg)
    expect(req).toMatchObject({ mode: 'optimize', n_trials: 10, search: { params: ['swing_len'], ranges: { swing_len: [2, 6] } } })
  })

  it('never sends n_trials/search for non-optimize modes', () => {
    const req = buildRunRequest(form, 'validate', defaultOptimizeConfig(T))
    expect(req.n_trials).toBeUndefined()
    expect(req.search).toBeUndefined()
  })

  it('validates ranges', () => {
    const cfg = defaultOptimizeConfig(T)
    cfg.ranges.swing_len = { enabled: true, min: '8', max: '3' }
    cfg.ranges.chop_limit = { enabled: true, min: '10', max: '90' }
    const e = validateOptimize(T, cfg)
    expect(e['search.swing_len']).toMatch(/lebih kecil/)
    expect(e['search.chop_limit']).toMatch(/Di luar batas 30/)
    for (const k of Object.keys(cfg.ranges)) cfg.ranges[k].enabled = false
    expect(validateOptimize(T, cfg).search).toBeDefined()
  })

  it('uses measured timings', () => {
    expect([10, 30, 60].map(estimateMinutes)).toEqual([3, 8, 15])
  })
})

describe('check reasons', () => {
  const c = (name: string, value: number | null, threshold: string): LabCheck => ({ name, label: name, value, threshold, passed: false })
  it('parses thresholds', () => {
    expect(thresholdNumber('>= 1.2')).toBe(1.2)
    expect(thresholdNumber('> -50.0')).toBe(-50)
    expect(thresholdNumber(null)).toBeNull()
  })
  it('writes plain-language Indonesian', () => {
    expect(checkReason(c('mc_dd_p95', -62, '> -50.0'))).toBe('Drawdown terburuk 95% bisa −62% (batas −50%)')
    expect(checkReason(c('cost_stress', -3.25, '> 0'))).toContain('biaya 2× lipat, return holdout jadi −3.3%')
    expect(checkReason(c('oos_profit_factor', null, '>= 1.2'))).toContain('tidak ada data')
  })
})

describe('relativeTime', () => {
  const now = Date.parse('2026-11-10T12:00:00Z')
  it('formats in Indonesian', () => {
    expect(relativeTime('2026-11-10T11:59:50Z', now)).toBe('baru saja')
    expect(relativeTime('2026-11-10T11:45:00Z', now)).toBe('15 mnt lalu')
    expect(relativeTime('2026-11-10T09:00:00Z', now)).toBe('3 jam lalu')
    expect(relativeTime('2026-11-08T12:00:00Z', now)).toBe('2 hari lalu')
    expect(relativeTime(null, now)).toBe('—')
  })
})

describe('2-year period preset (15m default)', () => {
  it('round-trips through presetRange / detectPreset', async () => {
    const { presetRange, detectPreset } = await import('./form')
    const today = new Date(Date.UTC(2026, 10, 11))
    expect(presetRange('2y', today)).toEqual({ start: '2024-11-11', end: '' })
    expect(detectPreset('2024-11-11', '', today)).toBe('2y')
  })
})

describe('groupLabel', () => {
  it('translates the MTF entry-timing group and falls back to the backend name', () => {
    expect(groupLabel('Entry timing (MTF)')).toBe('Timing entry (MTF, riset)')
    expect(groupLabel('Unknown group')).toBe('Unknown group')
  })
})
